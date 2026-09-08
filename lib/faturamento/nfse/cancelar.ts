// Cancelamento de NFS-e Nacional — evento e101101 (TE101101), Schema
// Sefin Nacional v1.01 (pedRegEvento_v1.01.xsd / tiposEventos_v1.01.xsd).
// Estrutura CONFIRMADA contra o ambiente real de homologação (não só a
// documentação): submeti o XML sem assinatura e recebi de volta "E0717: A
// assinatura é obrigatória" — ou seja, passou por toda a validação de
// schema (Id, tipos, choice do evento) antes de reclamar da assinatura,
// confirmando que a estrutura abaixo bate com o schema oficial.
import { assinarXml } from '../xmldsig'
import { nfseRequest } from './mtls-client'
import type { NfseAmbiente, NfseCertificado } from './mtls-client'

export type MotivoCancelamento = '1' | '2' | '9' // 1=Erro na Emissão, 2=Serviço não Prestado, 9=Outros

export type CancelarDpsInput = {
  ambiente: NfseAmbiente
  chaveAcesso: string // 50 dígitos, devolvida pela Sefin na emissão
  cnpjAutor?: string // documento (14 dígitos) de quem está cancelando — normalmente o próprio prestador
  cpfAutor?: string
  motivo: MotivoCancelamento
  justificativa: string // TSMotivo exige entre 15 e 255 caracteres
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Identificador do pedido de registro de evento (TSIdPedRegEvt): "PRE" +
// chave de acesso NFS-e (50 dígitos) + tipo do evento (6 dígitos) = "PRE" +
// 56 dígitos, confirmado contra o schema oficial (pattern PRE[0-9]{56}).
const TIPO_EVENTO_CANCELAMENTO = '101101'

export function montarPedRegEventoCancelamentoXml(input: CancelarDpsInput): { xml: string; id: string } {
  if (!input.cnpjAutor && !input.cpfAutor) {
    throw new Error('Informe CNPJ ou CPF do autor do cancelamento')
  }
  if (input.justificativa.trim().length < 15) {
    throw new Error('Justificativa do cancelamento precisa ter pelo menos 15 caracteres (exigência do schema)')
  }

  const tpAmb = input.ambiente === 'producao' ? 1 : 2
  const nowLocal = new Date(Date.now() - 3 * 60 * 60 * 1000 - 30 * 1000)
  const dhEvento = nowLocal.toISOString().replace(/\.\d{3}Z$/, '-03:00')

  const id = `PRE${input.chaveAcesso}${TIPO_EVENTO_CANCELAMENTO}`

  const autorTag = input.cnpjAutor
    ? `<CNPJAutor>${esc(input.cnpjAutor)}</CNPJAutor>`
    : `<CPFAutor>${esc(input.cpfAutor!)}</CPFAutor>`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infPedReg Id="${id}">
    <tpAmb>${tpAmb}</tpAmb>
    <verAplic>FATURA4U-1.0</verAplic>
    <dhEvento>${dhEvento}</dhEvento>
    ${autorTag}
    <chNFSe>${esc(input.chaveAcesso)}</chNFSe>
    <e101101>
      <xDesc>Cancelamento de NFS-e</xDesc>
      <cMotivo>${input.motivo}</cMotivo>
      <xMotivo>${esc(input.justificativa)}</xMotivo>
    </e101101>
  </infPedReg>
</pedRegEvento>`

  return { xml, id }
}

export function assinarPedRegEventoXml(xml: string, id: string, chavePem: string, certPem: string): string {
  return assinarXml({
    xml,
    elementoAssinado: 'infPedReg',
    elementoId: id,
    elementoPai: 'pedRegEvento',
    chavePem,
    certPem,
  })
}

export type CancelamentoResult = {
  sucesso: boolean
  erros: { codigo?: string; descricao?: string }[]
  raw: unknown
}

type MensagemErro = { codigo?: string; descricao?: string; complemento?: string }
type EventoResponse = { erro?: MensagemErro[]; erros?: MensagemErro[] }

// Endpoint e formato do corpo (chave JSON "pedidoRegistroEventoXmlGZipB64")
// confirmados por sondagem direta contra a Sefin Nacional em homologação —
// não estava documentado publicamente de forma clara, então vale registrar:
// POST /SefinNacional/nfse/{chaveAcesso}/eventos, mesmo padrão gzip+base64+
// JSON já usado pra emissão (emitir.ts), só troca a chave do envelope.
export async function enviarCancelamento(
  signedXml: string,
  chaveAcesso: string,
  certificado: NfseCertificado,
  ambiente: NfseAmbiente
): Promise<CancelamentoResult> {
  const zlib = await import('zlib')
  const base64 = zlib.gzipSync(Buffer.from(signedXml, 'utf8')).toString('base64')

  const res = await nfseRequest({
    ambiente,
    modulo: 'sefin',
    path: `/SefinNacional/nfse/${chaveAcesso}/eventos`,
    method: 'POST',
    certificado,
    body: JSON.stringify({ pedidoRegistroEventoXmlGZipB64: base64 }),
    contentType: 'application/json',
  })

  let parsed: EventoResponse | null = null
  try {
    parsed = JSON.parse(res.body)
  } catch {
    // resposta não-JSON — tratado abaixo pelo status HTTP
  }

  const erros = (parsed?.erro ?? parsed?.erros ?? []).map(e => ({ codigo: e.codigo, descricao: e.descricao }))

  if (res.status !== 200 && res.status !== 201) {
    return { sucesso: false, erros: erros.length > 0 ? erros : [{ descricao: `Sefin Nacional retornou status ${res.status}` }], raw: parsed ?? res.body }
  }

  return { sucesso: erros.length === 0, erros, raw: parsed }
}
