// Monta o XML da NF-e/NFC-e (infNFe), Layout 4.00 — schema completamente
// diferente do DPS da NFS-e (ver nfse/dps.ts): grupos ide/emit/dest/det×N/
// total/transp/pag/infAdic, com imposto por item (ICMS/PIS/COFINS) em vez
// de um único bloco de tributo por nota.
//
// ALERTA (mesmo espírito do aviso em dps.ts): a escolha de CST/CSOSN, a
// definição de substituição tributária por NCM/CEST, e a correção de
// PIS/COFINS dependem de orientação de contador — os defaults aqui (CSOSN
// 102 pro Simples/MEI, CST 00/40 pro regime normal, PIS/COFINS "isento" por
// padrão) são ponto de partida pra homologação, não fechamento tributário
// fechado. Ver plano: Fase 3 é sobre provar o encanamento funciona, não
// sobre tributação perfeita.
import { montarChaveAcesso } from './chave-acesso'

export type NfeItemInput = {
  numeroItem: number
  descricao: string
  ncm: string
  cfop: string
  unidade: string
  quantidade: number
  valorUnitario: number
  origemMercadoria: string // '0'..'8'
  icmsSituacaoTributaria: string // CST (regime normal) ou CSOSN (Simples) — sem prefixo
  aliquotaIcms?: number | null
}

export type NfeEnderecoInput = {
  logradouro: string
  numero: string
  bairro: string
  municipioIbge: string
  municipioNome: string
  uf: string
  cep: string
  complemento?: string | null
}

export type NfeEmitInput = {
  documento: string // CNPJ, 14 dígitos
  razaoSocial: string
  nomeFantasia?: string | null
  inscricaoEstadual: string
  // CRT: 1=Simples Nacional, 2=Simples excesso de sublimite, 3=Regime Normal
  crt: 1 | 2 | 3
  endereco: NfeEnderecoInput
  telefone?: string | null
}

export type NfeDestInput = {
  documento: string
  tipoDocumento: 'cnpj' | 'cpf'
  nome: string
  // 1=contribuinte ICMS, 2=isento, 9=não contribuinte (padrão pra pessoa física)
  indIEDest: 1 | 2 | 9
  inscricaoEstadual?: string | null
  endereco?: NfeEnderecoInput | null // pode faltar em NFC-e sem endereço de entrega
}

export type NfePagamentoInput = {
  tipo: string // tPag — 01 Dinheiro, 03 Cartão Crédito, 04 Cartão Débito, 15 Boleto, 17 PIX, 90 Sem pagamento
  valor: number
}

export type NfeXmlInput = {
  ambiente: 'homologacao' | 'producao'
  modelo: '55' | '65'
  uf: string
  serie: string
  numero: string
  municipioFatoGeradorIbge: string
  naturezaOperacao: string
  emitente: NfeEmitInput
  destinatario?: NfeDestInput | null // obrigatório no 55, opcional no 65
  itens: NfeItemInput[]
  pagamento?: NfePagamentoInput | null
  observacoes?: string | null
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function enderecoXml(tag: string, end: NfeEnderecoInput): string {
  return `<${tag}>` +
    `<xLgr>${esc(end.logradouro)}</xLgr>` +
    `<nro>${esc(end.numero || 'S/N')}</nro>` +
    (end.complemento ? `<xCpl>${esc(end.complemento)}</xCpl>` : '') +
    `<xBairro>${esc(end.bairro)}</xBairro>` +
    `<cMun>${esc(end.municipioIbge)}</cMun>` +
    `<xMun>${esc(end.municipioNome)}</xMun>` +
    `<UF>${esc(end.uf)}</UF>` +
    `<CEP>${end.cep.replace(/\D/g, '')}</CEP>` +
    `<cPais>1058</cPais>` +
    `<xPais>Brasil</xPais>` +
    `</${tag}>`
}

// Bloco ICMS por item — branch simples (CST 00/40 no regime normal, CSOSN
// 102 no Simples/MEI). Ver alerta no topo do arquivo.
function icmsXml(item: NfeItemInput, crt: NfeEmitInput['crt']): string {
  const orig = item.origemMercadoria
  const cst = item.icmsSituacaoTributaria
  const vBC = item.aliquotaIcms ? Number((item.quantidade * item.valorUnitario).toFixed(2)) : 0
  const vICMS = item.aliquotaIcms ? Number(((vBC * item.aliquotaIcms) / 100).toFixed(2)) : 0

  if (crt === 1 || crt === 2) {
    // Simples Nacional — CSOSN, sem base/alíquota nos códigos mais comuns
    // (102/103/300/400). CSOSN 101/500/900 exigem campos extras não cobertos
    // aqui ainda.
    const csosn = cst || '102'
    return `<ICMS><ICMSSN${csosn}><orig>${orig}</orig><CSOSN>${csosn}</CSOSN></ICMSSN${csosn}></ICMS>`
  }

  // Regime normal — CST 00 (tributação integral) quando há alíquota, senão
  // CST 40 (isenta) como fallback simples.
  if (item.aliquotaIcms && item.aliquotaIcms > 0) {
    const cstFmt = cst || '00'
    return `<ICMS><ICMS${cstFmt}><orig>${orig}</orig><CST>${cstFmt}</CST><modBC>3</modBC>` +
      `<vBC>${vBC.toFixed(2)}</vBC><pICMS>${item.aliquotaIcms.toFixed(2)}</pICMS><vICMS>${vICMS.toFixed(2)}</vICMS>` +
      `</ICMS${cstFmt}></ICMS>`
  }
  return `<ICMS><ICMS40><orig>${orig}</orig><CST>40</CST></ICMS40></ICMS>`
}

// PIS/COFINS simplificados como não-incidência (CST 07) — correção completa
// depende do regime específico do tenant, deixado pra endurecer depois que
// o encanamento estiver provado em homologação (ver plano, seção "pontos em
// aberto").
function pisConfinsXml(): string {
  return '<PIS><PISNT><CST>07</CST></PISNT></PIS><COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>'
}

export function montarNfeXml(input: NfeXmlInput): { xml: string; id: string; chaveAcesso: string } {
  const tpAmb = input.ambiente === 'producao' ? 1 : 2
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000) // -03:00 fixo (Brasil não tem mais horário de verão)
  const dhEmi = now.toISOString().replace(/\.\d{3}Z$/, '-03:00')
  const aamm = dhEmi.slice(2, 4) + dhEmi.slice(5, 7)

  const { chave } = montarChaveAcesso({
    uf: input.uf,
    aamm,
    cnpj: input.emitente.documento,
    modelo: input.modelo,
    serie: input.serie,
    numero: input.numero,
  })
  const id = `NFe${chave}`
  const cUF = chave.slice(0, 2)
  const cNF = chave.slice(35, 43)
  const cDV = chave.slice(43, 44)

  const itensXml = input.itens.map(item => {
    const vProd = Number((item.quantidade * item.valorUnitario).toFixed(2))
    return `<det nItem="${item.numeroItem}">` +
      `<prod>` +
      `<cProd>${esc(item.numeroItem.toString().padStart(6, '0'))}</cProd>` +
      `<cEAN>SEM GTIN</cEAN>` +
      `<xProd>${esc(item.descricao)}</xProd>` +
      `<NCM>${esc(item.ncm)}</NCM>` +
      `<CFOP>${esc(item.cfop)}</CFOP>` +
      `<uCom>${esc(item.unidade)}</uCom>` +
      `<qCom>${item.quantidade.toFixed(4)}</qCom>` +
      `<vUnCom>${item.valorUnitario.toFixed(10)}</vUnCom>` +
      `<vProd>${vProd.toFixed(2)}</vProd>` +
      `<cEANTrib>SEM GTIN</cEANTrib>` +
      `<uTrib>${esc(item.unidade)}</uTrib>` +
      `<qTrib>${item.quantidade.toFixed(4)}</qTrib>` +
      `<vUnTrib>${item.valorUnitario.toFixed(10)}</vUnTrib>` +
      `<indTot>1</indTot>` +
      `</prod>` +
      `<imposto>${icmsXml(item, input.emitente.crt)}${pisConfinsXml()}</imposto>` +
      `</det>`
  }).join('')

  const vProdTotal = input.itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)
  const vIcmsTotal = input.itens.reduce((s, i) => {
    if (!i.aliquotaIcms) return s
    return s + (i.quantidade * i.valorUnitario * i.aliquotaIcms) / 100
  }, 0)

  const totalXml = `<total><ICMSTot>` +
    `<vBC>0.00</vBC><vICMS>${vIcmsTotal.toFixed(2)}</vICMS><vICMSDeson>0.00</vICMSDeson>` +
    `<vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet>` +
    `<vProd>${vProdTotal.toFixed(2)}</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc>` +
    `<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS>` +
    `<vOutro>0.00</vOutro><vNF>${vProdTotal.toFixed(2)}</vNF>` +
    `</ICMSTot></total>`

  const destXml = input.destinatario
    ? (() => {
        const d = input.destinatario!
        const docTag = d.tipoDocumento === 'cnpj' ? 'CNPJ' : 'CPF'
        return `<dest>` +
          `<${docTag}>${esc(d.documento)}</${docTag}>` +
          `<xNome>${esc(d.nome)}</xNome>` +
          (d.endereco ? enderecoXml('enderDest', d.endereco) : '') +
          `<indIEDest>${d.indIEDest}</indIEDest>` +
          (d.inscricaoEstadual ? `<IE>${esc(d.inscricaoEstadual)}</IE>` : '') +
          `</dest>`
      })()
    : ''

  const pagamento = input.pagamento ?? { tipo: '01', valor: vProdTotal }
  const pagXml = `<pag><detPag><tPag>${pagamento.tipo}</tPag><vPag>${pagamento.valor.toFixed(2)}</vPag></detPag></pag>`

  const indFinal = input.modelo === '65' ? '1' : (input.destinatario ? '0' : '1')
  const indPres = input.modelo === '65' ? '1' : '9' // NFC-e sempre presencial; NF-e "9" = não se aplica, ajustar se precisar de outro caso
  const tpImp = input.modelo === '65' ? '4' : '1' // 4 = DANFCE, 1 = DANFE retrato

  const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">` +
    `<infNFe Id="${id}" versao="4.00">` +
    `<ide>` +
    `<cUF>${cUF}</cUF>` +
    `<cNF>${cNF}</cNF>` +
    `<natOp>${esc(input.naturezaOperacao)}</natOp>` +
    `<mod>${input.modelo}</mod>` +
    `<serie>${esc(input.serie)}</serie>` +
    `<nNF>${esc(input.numero)}</nNF>` +
    `<dhEmi>${dhEmi}</dhEmi>` +
    `<tpNF>1</tpNF>` +
    `<idDest>1</idDest>` +
    `<cMunFG>${esc(input.municipioFatoGeradorIbge)}</cMunFG>` +
    `<tpImp>${tpImp}</tpImp>` +
    `<tpEmis>1</tpEmis>` +
    `<cDV>${cDV}</cDV>` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<finNFe>1</finNFe>` +
    `<indFinal>${indFinal}</indFinal>` +
    `<indPres>${indPres}</indPres>` +
    `<procEmi>0</procEmi>` +
    `<verProc>FATURA4U-1.0</verProc>` +
    `</ide>` +
    `<emit>` +
    `<CNPJ>${esc(input.emitente.documento)}</CNPJ>` +
    `<xNome>${esc(input.emitente.razaoSocial)}</xNome>` +
    (input.emitente.nomeFantasia ? `<xFant>${esc(input.emitente.nomeFantasia)}</xFant>` : '') +
    enderecoXml('enderEmit', input.emitente.endereco) +
    `<IE>${esc(input.emitente.inscricaoEstadual)}</IE>` +
    `<CRT>${input.emitente.crt}</CRT>` +
    `</emit>` +
    destXml +
    itensXml +
    totalXml +
    `<transp><modFrete>9</modFrete></transp>` +
    pagXml +
    (input.observacoes ? `<infAdic><infCpl>${esc(input.observacoes)}</infCpl></infAdic>` : '') +
    `</infNFe>` +
    `</NFe>`

  return { xml, id, chaveAcesso: chave }
}
