// Carta de Correção Eletrônica (CC-e) — evento 110110 da NF-e (modelo 55
// apenas; NFC-e não admite). AVISO: mesma situação do cancelamento — segue o
// padrão nacional SEFAZ mas nunca foi testada contra uma nota realmente
// autorizada (falta certificado de CNPJ com Inscrição Estadual).
import { assinarXml } from '../xmldsig'
import { soapRequest, montarEnvelopeSoap, extrairCorpoResposta } from './soap-client'
import type { NfeAmbiente, NfeCertificado } from './soap-client'

// Texto fixo exigido pelo leiaute (xCondUso) — não pode ser alterado.
const COND_USO =
  'A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 ' +
  'e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao ' +
  'esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, ' +
  'diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que ' +
  'implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.'

export type CartaCorrecaoInput = {
  ambiente: NfeAmbiente
  chaveAcesso: string
  cnpj: string
  correcao: string // xCorrecao — 15 a 1000 caracteres
  sequencia: number // nSeqEvento — 1 a 20
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function montarEventoCartaCorrecaoXml(input: CartaCorrecaoInput): { xml: string; id: string; cUF: string } {
  const correcao = input.correcao.trim()
  if (correcao.length < 15 || correcao.length > 1000) {
    throw new Error('A correção precisa ter entre 15 e 1000 caracteres')
  }

  const cUF = input.chaveAcesso.slice(0, 2)
  const tpAmb = input.ambiente === 'producao' ? 1 : 2
  const nowLocal = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const dhEvento = nowLocal.toISOString().replace(/\.\d{3}Z$/, '-03:00')
  const id = `ID110110${input.chaveAcesso}${String(input.sequencia).padStart(2, '0')}`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
    `<infEvento Id="${id}">` +
    `<cOrgao>${cUF}</cOrgao>` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<CNPJ>${esc(input.cnpj)}</CNPJ>` +
    `<chNFe>${esc(input.chaveAcesso)}</chNFe>` +
    `<dhEvento>${dhEvento}</dhEvento>` +
    `<tpEvento>110110</tpEvento>` +
    `<nSeqEvento>${input.sequencia}</nSeqEvento>` +
    `<verEvento>1.00</verEvento>` +
    `<detEvento versao="1.00">` +
    `<descEvento>Carta de Correcao</descEvento>` +
    `<xCorrecao>${esc(correcao)}</xCorrecao>` +
    `<xCondUso>${COND_USO}</xCondUso>` +
    `</detEvento>` +
    `</infEvento>` +
    `</evento>`

  return { xml, id, cUF }
}

export function assinarEventoCartaCorrecaoXml(xml: string, id: string, chavePem: string, certPem: string): string {
  return assinarXml({ xml, elementoAssinado: 'infEvento', elementoId: id, elementoPai: 'evento', chavePem, certPem })
}

export type CartaCorrecaoResult = {
  sucesso: boolean
  cStat: string | null
  xMotivo: string | null
  protocolo: string | null
  raw: string
}

function extrairTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return match ? match[1] : null
}

export async function enviarCartaCorrecao(params: {
  signedXml: string
  cUF: string
  uf: string
  ambiente: NfeAmbiente
  certificado: NfeCertificado
}): Promise<CartaCorrecaoResult> {
  const xmlNegocio = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
    `<idLote>${Date.now()}</idLote>` +
    params.signedXml.replace(/^<\?xml[^>]*\?>/, '') +
    `</envEvento>`

  const res = await soapRequest({
    uf: params.uf,
    modelo: '55',
    ambiente: params.ambiente,
    servico: 'NFeRecepcaoEvento4',
    envelopeXml: montarEnvelopeSoap({ servico: 'NFeRecepcaoEvento4', cUF: params.cUF, xmlNegocio }),
    certificado: params.certificado,
  })

  if (res.status !== 200) {
    return { sucesso: false, cStat: null, xMotivo: `HTTP ${res.status}`, protocolo: null, raw: res.body }
  }

  const corpo = extrairCorpoResposta(res.body)
  const retEventoMatch = corpo.match(/<retEvento[\s\S]*?<infEvento>([\s\S]*?)<\/infEvento>/)
  const infEventoResp = retEventoMatch ? retEventoMatch[1] : corpo
  const cStat = extrairTag(infEventoResp, 'cStat') ?? extrairTag(corpo, 'cStat')
  const xMotivo = extrairTag(infEventoResp, 'xMotivo') ?? extrairTag(corpo, 'xMotivo')

  return {
    sucesso: cStat === '135' || cStat === '136',
    cStat,
    xMotivo,
    protocolo: extrairTag(infEventoResp, 'nProt'),
    raw: res.body,
  }
}
