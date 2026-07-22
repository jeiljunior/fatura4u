// Envia a DPS assinada pro endpoint de RECEPÇÃO (emissão) da NFS-e Nacional.
// Descoberto na prática: submeter pro ADN (/DFe) devolve "E1242: Tipo DF-e
// não tratado" — o endpoint certo de emissão é o Sefin Nacional
// (/SefinNacional/nfse), não o ADN (que é só consulta/distribuição/DANFSe).
// Formato do corpo (lote gzip+base64) mantido igual ao que a doc do ADN
// descreve — ainda não confirmado se o Sefin usa exatamente o mesmo shape.
import zlib from 'zlib'
import { nfseRequest } from './mtls-client'
import type { NfseAmbiente, NfseCertificado } from './mtls-client'

export type EmitirDpsResult = {
  chaveAcesso: string | null
  nsuRecepcao: string | null
  statusProcessamento: string | null
  alertas: { codigo?: string; descricao?: string }[]
  erros: { codigo?: string; descricao?: string }[]
  raw: unknown
}

type MensagemErro = { Codigo?: string; codigo?: string; Descricao?: string; descricao?: string }

// Formato de resposta real do Sefin Nacional, confirmado em teste (difere do
// formato descrito na doc do ADN — nem sempre vem dentro de um "Lote"):
// { tipoAmbiente, versaoAplicativo, dataHoraProcessamento, erros: [...], chaveAcesso?, nsuRecepcao? }
// Mantemos leitura tolerante a maiúsculas/minúsculas e à presença opcional de "Lote".
type SefinResponse = {
  chaveAcesso?: string
  ChaveAcesso?: string
  nsuRecepcao?: string
  NsuRecepcao?: string
  statusProcessamento?: string
  StatusProcessamento?: string
  erros?: MensagemErro[]
  Erros?: MensagemErro[]
  alertas?: MensagemErro[]
  Alertas?: MensagemErro[]
  Lote?: Array<{
    ChaveAcesso?: string
    NsuRecepcao?: string
    StatusProcessamento?: string
    Alertas?: MensagemErro[]
    Erros?: MensagemErro[]
  }>
}

function normalizarMensagens(msgs?: MensagemErro[]): { codigo?: string; descricao?: string }[] {
  return (msgs ?? []).map(m => ({ codigo: m.Codigo ?? m.codigo, descricao: m.Descricao ?? m.descricao }))
}

export async function emitirDps(
  signedXml: string,
  certificado: NfseCertificado,
  ambiente: NfseAmbiente
): Promise<EmitirDpsResult> {
  const base64 = zlib.gzipSync(Buffer.from(signedXml, 'utf8')).toString('base64')

  const res = await nfseRequest({
    ambiente,
    modulo: 'sefin',
    path: '/SefinNacional/nfse',
    method: 'POST',
    certificado,
    body: JSON.stringify({ dpsXmlGZipB64: base64 }),
    contentType: 'application/json',
  })

  let parsed: SefinResponse | null = null
  try {
    parsed = JSON.parse(res.body)
  } catch {
    // resposta não-JSON (ex: erro HTML de infraestrutura) — tratado abaixo
  }

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Sefin Nacional retornou status ${res.status}: ${res.body.slice(0, 500)}`)
  }

  // Alguns retornos vêm com um item de "Lote", outros direto na raiz — cobre os dois.
  const doc = parsed?.Lote?.[0] ?? parsed ?? undefined

  return {
    chaveAcesso: doc?.ChaveAcesso ?? parsed?.chaveAcesso ?? null,
    nsuRecepcao: doc?.NsuRecepcao ?? parsed?.nsuRecepcao ?? null,
    statusProcessamento: doc?.StatusProcessamento ?? parsed?.statusProcessamento ?? null,
    alertas: normalizarMensagens(doc?.Alertas ?? parsed?.alertas),
    erros: normalizarMensagens(doc?.Erros ?? parsed?.erros),
    raw: parsed,
  }
}
