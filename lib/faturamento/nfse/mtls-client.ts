// Cliente HTTP com mTLS pra falar com a NFS-e Nacional (ADN/Sefin/DANFSe/etc).
// Usa https.request nativo do Node (não fetch) — o fetch do Next.js
// (baseado em undici) tem suporte instável a certificado de cliente
// customizado em ambiente serverless.
import https from 'https'

export type NfseAmbiente = 'homologacao' | 'producao'
export type NfseModulo = 'adn' | 'sefin'

// ADN = consulta/distribuição/DANFSe. Sefin Nacional = recepção da DPS
// (emissão) — submeter a DPS pro ADN (/DFe) devolve "E1242: Tipo DF-e não
// tratado", o endpoint certo de emissão é o Sefin.
const HOSTS: Record<NfseModulo, Record<NfseAmbiente, string>> = {
  adn: {
    homologacao: 'adn.producaorestrita.nfse.gov.br',
    producao: 'adn.nfse.gov.br',
  },
  sefin: {
    homologacao: 'sefin.producaorestrita.nfse.gov.br',
    producao: 'sefin.nfse.gov.br',
  },
}

// PEM (não pfx+senha bruto) — Node 24 / OpenSSL 3.x recusa muitos .pfx reais
// (erro "Unsupported PKCS12 PFX data" / ERR_CRYPTO_UNSUPPORTED_OPERATION)
// porque o provider "legacy" do OpenSSL (necessário pra alguns esquemas de
// cifra de PKCS12 mais antigos, comuns em certificados ICP-Brasil) não vem
// habilitado por padrão. node-forge (usado em certificado.ts) não depende
// do OpenSSL do sistema e consegue ler esses .pfx sem problema — então
// extraímos a chave/certificado em PEM uma vez (extrairChaveECertificado) e
// usamos isso tanto pra assinar o XML quanto pro mTLS, nunca passando o
// .pfx bruto pro https.request nativo.
export type NfseCertificado = { certPem: string; chavePem: string }

export type NfseResponse = { status: number; body: string; bodyBuffer: Buffer }

export function nfseRequest(params: {
  ambiente: NfseAmbiente
  modulo?: NfseModulo
  path: string
  method?: string
  certificado: NfseCertificado
  body?: string
  contentType?: string
}): Promise<NfseResponse> {
  return new Promise((resolve, reject) => {
    const bodyBuffer = params.body ? Buffer.from(params.body, 'utf8') : undefined

    const req = https.request(
      {
        host: HOSTS[params.modulo ?? 'adn'][params.ambiente],
        path: params.path,
        method: params.method ?? 'GET',
        cert: params.certificado.certPem,
        key: params.certificado.chavePem,
        headers: bodyBuffer
          ? {
              'Content-Type': params.contentType ?? 'application/xml',
              'Content-Length': bodyBuffer.length,
            }
          : undefined,
        timeout: 15000,
      },
      res => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => { chunks.push(chunk) })
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          resolve({ status: res.statusCode ?? 0, body: buf.toString('utf8'), bodyBuffer: buf })
        })
      }
    )

    req.on('timeout', () => req.destroy(new Error('Tempo esgotado ao conectar na NFS-e Nacional')))
    req.on('error', reject)

    if (bodyBuffer) req.write(bodyBuffer)
    req.end()
  })
}

// Teste de conectividade: acessa a própria documentação Swagger da ADN.
// Sem certificado válido, esse endpoint devolve 496 (SSL/certificado exigido)
// mesmo só pra ver a página — então um 200 aqui já prova que o mTLS com o
// certificado do tenant foi aceito pela ADN.
export async function testarConexaoAdn(certificado: NfseCertificado, ambiente: NfseAmbiente): Promise<NfseResponse> {
  return nfseRequest({ ambiente, path: '/docs/index.html', method: 'GET', certificado })
}
