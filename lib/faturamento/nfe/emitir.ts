// Envia a NF-e/NFC-e assinada pro NFeAutorizacao4 da SEFAZ e resolve o
// resultado — diferente da NFS-e Nacional (chamada JSON síncrona única),
// aqui o protocolo é SOAP e o processamento pode ser síncrono OU
// assíncrono, dependendo do que a SEFAZ decidir na hora:
//   - indSinc=1 pede processamento síncrono (padrão pra lote de 1 nota,
//     que é sempre o nosso caso — NFC-e É sempre síncrona por natureza,
//     NF-e também aceita) — a resposta já vem com o protocolo dentro.
//   - Se mesmo assim a SEFAZ devolver cStat=103 (lote em processamento
//     assíncrono), precisa consultar o recibo depois via NFeRetAutorizacao4
//     — coberto por consultarRecibo(), com poll/backoff feito pelo
//     orquestrador (emitir-nota.ts), não aqui.
import { soapRequest, montarEnvelopeSoap, extrairCorpoResposta } from './soap-client'
import type { NfeAmbiente, Modelo, NfeCertificado } from './soap-client'

export type EmitirNfeResult = {
  cStat: string | null
  xMotivo: string | null
  chaveAcesso: string | null
  protocolo: string | null
  recibo: string | null // presente só quando cStat=103 (processamento assíncrono) — usar em consultarRecibo
  raw: string
}

function extrairTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return match ? match[1] : null
}

export async function enviarLoteNfe(params: {
  signedXml: string
  uf: string
  modelo: Modelo
  ambiente: NfeAmbiente
  certificado: NfeCertificado
}): Promise<EmitirNfeResult> {
  // cUF do cabeçalho SOAP é o código numérico (ex: 41), não a sigla — já
  // está gravado no próprio XML assinado (<ide><cUF>), extrai de lá em vez
  // de resolver de novo a partir da sigla.
  const cUFNum = extrairTag(params.signedXml, 'cUF') ?? ''

  const xmlNegocio = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">` +
    `<idLote>${Date.now()}</idLote>` +
    `<indSinc>1</indSinc>` +
    params.signedXml.replace(/^<\?xml[^>]*\?>/, '') +
    `</enviNFe>`

  const envelope = montarEnvelopeSoap({
    servico: 'NFeAutorizacao4',
    cUF: cUFNum,
    xmlNegocio,
  })

  const res = await soapRequest({
    uf: params.uf,
    modelo: params.modelo,
    ambiente: params.ambiente,
    servico: 'NFeAutorizacao4',
    envelopeXml: envelope,
    certificado: params.certificado,
  })

  if (res.status !== 200) {
    throw new Error(`SEFAZ-${params.uf} (NFeAutorizacao4) retornou HTTP ${res.status}: ${res.body.slice(0, 500)}`)
  }

  const corpo = extrairCorpoResposta(res.body)
  const cStatLote = extrairTag(corpo, 'cStat')
  const xMotivoLote = extrairTag(corpo, 'xMotivo')
  const recibo = extrairTag(corpo, 'nRec')

  // Processamento assíncrono (cStat 103/105) — sem protocolo ainda, quem
  // chamou precisa consultar o recibo depois.
  if (recibo && cStatLote !== '104') {
    return { cStat: cStatLote, xMotivo: xMotivoLote, chaveAcesso: null, protocolo: null, recibo, raw: res.body }
  }

  // Processamento síncrono — protocolo já vem dentro de protNFe/infProt.
  const protMatch = corpo.match(/<protNFe[\s\S]*?<infProt>([\s\S]*?)<\/infProt>/)
  const infProt = protMatch ? protMatch[1] : corpo

  return {
    cStat: extrairTag(infProt, 'cStat') ?? cStatLote,
    xMotivo: extrairTag(infProt, 'xMotivo') ?? xMotivoLote,
    chaveAcesso: extrairTag(infProt, 'chNFe'),
    protocolo: extrairTag(infProt, 'nProt'),
    recibo: null,
    raw: res.body,
  }
}

// Usado só quando enviarLoteNfe voltou com `recibo` preenchido (processamento
// assíncrono) — o orquestrador decide o backoff entre tentativas.
export async function consultarRecibo(params: {
  recibo: string
  cUF: string
  uf: string
  modelo: Modelo
  ambiente: NfeAmbiente
  certificado: NfeCertificado
}): Promise<EmitirNfeResult> {
  const xmlNegocio = `<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">` +
    `<tpAmb>${params.ambiente === 'producao' ? 1 : 2}</tpAmb>` +
    `<nRec>${params.recibo}</nRec>` +
    `</consReciNFe>`

  const envelope = montarEnvelopeSoap({ servico: 'NFeRetAutorizacao4', cUF: params.cUF, xmlNegocio })

  const res = await soapRequest({
    uf: params.uf,
    modelo: params.modelo,
    ambiente: params.ambiente,
    servico: 'NFeRetAutorizacao4',
    envelopeXml: envelope,
    certificado: params.certificado,
  })

  if (res.status !== 200) {
    throw new Error(`SEFAZ-${params.uf} (NFeRetAutorizacao4) retornou HTTP ${res.status}: ${res.body.slice(0, 500)}`)
  }

  const corpo = extrairCorpoResposta(res.body)
  const cStatLote = extrairTag(corpo, 'cStat')

  // cStat 105 = lote ainda em processamento — quem chamou decide se tenta de novo.
  if (cStatLote === '105') {
    return { cStat: cStatLote, xMotivo: extrairTag(corpo, 'xMotivo'), chaveAcesso: null, protocolo: null, recibo: params.recibo, raw: res.body }
  }

  const protMatch = corpo.match(/<protNFe[\s\S]*?<infProt>([\s\S]*?)<\/infProt>/)
  const infProt = protMatch ? protMatch[1] : corpo

  return {
    cStat: extrairTag(infProt, 'cStat') ?? cStatLote,
    xMotivo: extrairTag(infProt, 'xMotivo'),
    chaveAcesso: extrairTag(infProt, 'chNFe'),
    protocolo: extrairTag(infProt, 'nProt'),
    recibo: null,
    raw: res.body,
  }
}
