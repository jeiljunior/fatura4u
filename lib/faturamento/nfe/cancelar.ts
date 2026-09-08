// Cancelamento de NF-e/NFC-e — evento 110111, padrão nacional SEFAZ
// (envEventoCancNFe), o mesmo mecanismo usado há mais de uma década em
// todo o país — bem mais estável que o cancelamento da NFS-e Nacional
// (que é novo e tivemos que confirmar campo a campo contra o ambiente
// real). AVISO: diferente do cancelamento de NFS-e (verificado ao vivo
// contra a Sefin Nacional em homologação), esta estrutura segue a
// especificação padrão do evento 110111 mas ainda não foi testada contra
// a SEFAZ-PR de verdade — não tínhamos, até agora, nenhuma NF-e/NFC-e
// realmente autorizada pra cancelar (bloqueado pela falta de um CNPJ de
// teste com Inscrição Estadual). Rodar o primeiro teste real assim que
// tiver isso.
import { assinarXml } from '../xmldsig'
import { soapRequest, montarEnvelopeSoap, extrairCorpoResposta } from './soap-client'
import type { NfeAmbiente, Modelo, NfeCertificado } from './soap-client'

export type CancelarNfeInput = {
  ambiente: NfeAmbiente
  uf: string
  chaveAcesso: string // 44 dígitos
  cnpj: string
  protocoloAutorizacao: string // nProt devolvido na emissão
  justificativa: string // xJust — mínimo 15 caracteres no padrão SEFAZ
  numeroSequencialEvento?: number // nSeqEvento — 1 na primeira tentativa
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function montarEventoCancelamentoXml(input: CancelarNfeInput): { xml: string; id: string; cUF: string } {
  if (input.justificativa.trim().length < 15) {
    throw new Error('Justificativa do cancelamento precisa ter pelo menos 15 caracteres')
  }

  const cUF = input.chaveAcesso.slice(0, 2)
  const tpAmb = input.ambiente === 'producao' ? 1 : 2
  const nSeqEvento = input.numeroSequencialEvento ?? 1
  const nowLocal = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const dhEvento = nowLocal.toISOString().replace(/\.\d{3}Z$/, '-03:00')

  // Id (TSIdEvento padrão NF-e): "ID" + tpEvento(6) + chave(44) + nSeqEvento(2, zero-padded)
  const id = `ID110111${input.chaveAcesso}${String(nSeqEvento).padStart(2, '0')}`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
    `<infEvento Id="${id}">` +
    `<cOrgao>${cUF}</cOrgao>` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<CNPJ>${esc(input.cnpj)}</CNPJ>` +
    `<chNFe>${esc(input.chaveAcesso)}</chNFe>` +
    `<dhEvento>${dhEvento}</dhEvento>` +
    `<tpEvento>110111</tpEvento>` +
    `<nSeqEvento>${nSeqEvento}</nSeqEvento>` +
    `<verEvento>1.00</verEvento>` +
    `<detEvento versao="1.00">` +
    `<descEvento>Cancelamento</descEvento>` +
    `<nProt>${esc(input.protocoloAutorizacao)}</nProt>` +
    `<xJust>${esc(input.justificativa)}</xJust>` +
    `</detEvento>` +
    `</infEvento>` +
    `</evento>`

  return { xml, id, cUF }
}

export function assinarEventoCancelamentoXml(xml: string, id: string, chavePem: string, certPem: string): string {
  return assinarXml({
    xml,
    elementoAssinado: 'infEvento',
    elementoId: id,
    elementoPai: 'evento',
    chavePem,
    certPem,
  })
}

export type CancelamentoNfeResult = {
  sucesso: boolean
  cStat: string | null
  xMotivo: string | null
  raw: string
}

function extrairTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return match ? match[1] : null
}

export async function enviarCancelamentoNfe(params: {
  signedXml: string
  cUF: string
  uf: string
  modelo: Modelo
  ambiente: NfeAmbiente
  certificado: NfeCertificado
}): Promise<CancelamentoNfeResult> {
  const xmlNegocio = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
    `<idLote>${Date.now()}</idLote>` +
    params.signedXml.replace(/^<\?xml[^>]*\?>/, '') +
    `</envEvento>`

  const envelope = montarEnvelopeSoap({ servico: 'NFeRecepcaoEvento4', cUF: params.cUF, xmlNegocio })

  const res = await soapRequest({
    uf: params.uf,
    modelo: params.modelo,
    ambiente: params.ambiente,
    servico: 'NFeRecepcaoEvento4',
    envelopeXml: envelope,
    certificado: params.certificado,
  })

  if (res.status !== 200) {
    return { sucesso: false, cStat: null, xMotivo: `HTTP ${res.status}`, raw: res.body }
  }

  const corpo = extrairCorpoResposta(res.body)
  // cStat do LOTE de evento (135/136 = evento registrado; outros = rejeição
  // do lote inteiro). O cStat do evento individual fica dentro de retEvento,
  // conferimos os dois por segurança.
  const retEventoMatch = corpo.match(/<retEvento[\s\S]*?<infEvento>([\s\S]*?)<\/infEvento>/)
  const infEventoResp = retEventoMatch ? retEventoMatch[1] : corpo
  const cStat = extrairTag(infEventoResp, 'cStat') ?? extrairTag(corpo, 'cStat')
  const xMotivo = extrairTag(infEventoResp, 'xMotivo') ?? extrairTag(corpo, 'xMotivo')

  const sucesso = cStat === '135' || cStat === '136'
  return { sucesso, cStat, xMotivo, raw: res.body }
}
