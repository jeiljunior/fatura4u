// Cliente SOAP com mTLS pra falar com a SEFAZ (NF-e/NFC-e) — diferente da
// NFS-e Nacional, que é um endpoint JSON único nacional, aqui cada UF tem
// seu próprio webservice e o protocolo é SOAP 1.2, não JSON.
//
// Reaproveita o mecanismo de mTLS via https.request nativo (não fetch, pelo
// mesmo motivo do nfse/mtls-client.ts: suporte instável a certificado de
// cliente no fetch/undici em serverless) — só troca o transporte (envelope
// SOAP em vez de corpo JSON/gzip) e o mapa de hosts (por UF+modelo, não um
// endpoint nacional único).
import https from 'https'

export type NfeAmbiente = 'homologacao' | 'producao'
export type Modelo = '55' | '65'

export type NfeServico =
  | 'NFeAutorizacao4'
  | 'NFeRetAutorizacao4'
  | 'NFeConsultaProtocolo4'
  | 'NFeInutilizacao4'
  | 'NFeStatusServico4'
  | 'CadConsultaCadastro4'
  | 'NFeRecepcaoEvento4'

// Endpoints confirmados na fonte oficial (SPED/SEFAZ-PR:
// https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400
// e https://sped.fazenda.pr.gov.br/NFCe/Pagina/Web-Services-NFC-e), 2026-08.
// NF-e e NFC-e usam HOSTS SEPARADOS no PR (nfe. vs nfce.) — não é um
// endpoint único compartilhado entre os dois modelos.
const HOSTS: Record<string, Record<Modelo, Record<NfeAmbiente, string>>> = {
  PR: {
    '55': {
      homologacao: 'homologacao.nfe.sefa.pr.gov.br',
      producao: 'nfe.sefa.pr.gov.br',
    },
    '65': {
      homologacao: 'homologacao.nfce.sefa.pr.gov.br',
      producao: 'nfce.sefa.pr.gov.br',
    },
  },
  // SC, SP, RS, RJ entram aqui na ordem do rollout — não adivinhar, seguir
  // o mesmo processo de confirmar no portal/SEFAZ de cada estado antes de
  // habilitar (ver Fase 1 do plano: PR não usa o ambiente SVRS, mas alguns
  // desses podem usar).
}

function montarPath(modelo: Modelo, servico: NfeServico): string {
  const pasta = modelo === '55' ? 'nfe' : 'nfce'
  return `/${pasta}/${servico}`
}

export function resolverHost(uf: string, modelo: Modelo, ambiente: NfeAmbiente): string {
  const porUf = HOSTS[uf.toUpperCase()]
  if (!porUf) throw new Error(`UF "${uf}" ainda não tem endpoints SEFAZ configurados em soap-client.ts`)
  return porUf[modelo][ambiente]
}

export type NfeCertificado = { pfxBuffer: Buffer; senha: string }

export type SoapResponse = { status: number; body: string }

// Envia um envelope SOAP 1.2 já montado (ver nfe-xml.ts/emitir.ts pra quem
// monta o envelope em si) via mTLS com o certificado do tenant.
export function soapRequest(params: {
  uf: string
  modelo: Modelo
  ambiente: NfeAmbiente
  servico: NfeServico
  soapAction?: string
  envelopeXml: string
  certificado: NfeCertificado
}): Promise<SoapResponse> {
  return new Promise((resolve, reject) => {
    const host = resolverHost(params.uf, params.modelo, params.ambiente)
    const path = montarPath(params.modelo, params.servico)
    const bodyBuffer = Buffer.from(params.envelopeXml, 'utf8')

    const headers: Record<string, string | number> = {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'Content-Length': bodyBuffer.length,
    }
    // SOAPAction exato por operação precisa ser confirmado contra o WSDL
    // real (ex: baixando NFeAutorizacao4?wsdl) — SOAP 1.2 aceita a action
    // embutida no Content-Type (parâmetro action=) em vez de um header
    // separado; ambos os formatos existem em serviços da SEFAZ dependendo
    // da versão. Ajustar aqui na primeira rodada de teste real.
    if (params.soapAction) {
      headers['Content-Type'] = `application/soap+xml; charset=utf-8; action="${params.soapAction}"`
    }

    const req = https.request(
      {
        host,
        path,
        method: 'POST',
        pfx: params.certificado.pfxBuffer,
        passphrase: params.certificado.senha,
        headers,
        timeout: 20000,
      },
      res => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => { chunks.push(chunk) })
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') })
        })
      }
    )

    req.on('timeout', () => req.destroy(new Error(`Tempo esgotado ao conectar na SEFAZ-${params.uf} (${params.servico})`)))
    req.on('error', reject)

    req.write(bodyBuffer)
    req.end()
  })
}

// Monta o envelope SOAP 1.2 padrão dos webservices de NF-e/NFC-e — Header
// com nfeCabecMsg (cUF + versaoDados) e Body com nfeDadosMsg envolvendo o
// XML de negócio (enviNFe, consStatServ, etc, dependendo do serviço).
// Namespace por operação (`http://www.portalfiscal.inf.br/nfe/wsdl/<Servico>`)
// é o padrão documentado da SEFAZ — confirmar contra o WSDL real do PR antes
// da primeira chamada de verdade.
export function montarEnvelopeSoap(params: {
  servico: NfeServico
  cUF: string
  xmlNegocio: string
  versaoDados?: string
}): string {
  const ns = `http://www.portalfiscal.inf.br/nfe/wsdl/${params.servico}`
  const versao = params.versaoDados ?? '4.00'
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap12:Header><nfeCabecMsg xmlns="${ns}"><cUF>${params.cUF}</cUF><versaoDados>${versao}</versaoDados></nfeCabecMsg></soap12:Header>` +
    `<soap12:Body><nfeDadosMsg xmlns="${ns}">${params.xmlNegocio}</nfeDadosMsg></soap12:Body>` +
    `</soap12:Envelope>`
}

// Extrai o conteúdo de dentro de <nfeResultMsg>/equivalente da resposta SOAP
// — parsing simples por regex (o corpo já vem como XML de negócio dentro do
// envelope, sem precisar de um parser SOAP completo pra esse caso de uso).
export function extrairCorpoResposta(soapBody: string): string {
  const match = soapBody.match(/<(?:\w+:)?(?:nfeResultMsg|nfeStatusServicoNFResult|nfeConsultaProtocoloResult|\w*ResultMsg)[^>]*>([\s\S]*?)<\/(?:\w+:)?\w*Result\w*>/i)
  return match ? match[1] : soapBody
}
