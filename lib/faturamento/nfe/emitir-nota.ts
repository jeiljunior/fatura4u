// Orquestra a emissão de uma NF-e/NFC-e (monta XML, calcula chave de acesso,
// assina, envia pra SEFAZ, grava o resultado) — mesmo formato comprovado do
// nfse/emitir-nota.ts (carrega tudo em paralelo, grava a nota como
// 'processando' ANTES de chamar o governo, atualiza depois com o resultado
// final), mas com o motor todo trocado por baixo (SEFAZ estadual/SOAP em vez
// de Sefin Nacional/JSON).
//
// Fase 3 do plano: foco em NFC-e (65) funcionando ponta a ponta — o
// destinatário (`dest`) é opcional nesse modelo, então dá pra emitir sem
// resolver ainda o mapeamento endereço-do-cliente -> código IBGE do
// município (isso fica pra Fase 4, junto da tela de emissão e do suporte
// completo a NF-e/55, que exige destinatário plenamente identificado).
import { createClient } from '@supabase/supabase-js'
import { decryptJSON } from '../crypto'
import { extrairChaveECertificado } from '../nfse/certificado'
import { montarNfeXml } from './nfe-xml'
import type { NfeDestInput, NfeItemInput } from './nfe-xml'
import { assinarNfeXml } from './assinar'
import { enviarLoteNfe, consultarRecibo } from './emitir'
import type { Modelo, NfeAmbiente } from './soap-client'
import type { NotaProdutoStatus } from '../types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type EmitirNotaProdutoItemInput = {
  produtoId?: string | null
  descricao?: string // se omitido, usa o nome do produto do catálogo
  quantidade: number
  valorUnitario?: number // se omitido, usa o preço do catálogo
  ncm?: string
  cfop?: string
}

export type EmitirNotaProdutoParams = {
  businessId: string
  modelo: Modelo
  customerId?: string | null
  chargeId?: string | null
  itens: EmitirNotaProdutoItemInput[]
  // Obrigatório pro modelo 55 (NF-e) — Fase 3 não resolve o mapeamento
  // automático endereço-do-cliente -> IBGE ainda, então quem chama monta o
  // destinatário à mão nesse modelo por enquanto.
  destinatario?: NfeDestInput | null
  naturezaOperacao?: string
}

export class EmitirNotaProdutoError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

// Poucas tentativas com espera curta — se a SEFAZ processar assíncrono e não
// resolver nesse intervalo, a nota fica 'processando' pra reconciliação
// posterior (Fase 5 do plano, ainda não implementada).
const MAX_TENTATIVAS_POLL = 4
const INTERVALO_POLL_MS = 3000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function emitirNotaProduto(params: EmitirNotaProdutoParams) {
  const { businessId, modelo, customerId, chargeId, itens, destinatario, naturezaOperacao } = params

  if (modelo === '55' && !destinatario) {
    throw new EmitirNotaProdutoError('NF-e (modelo 55) exige destinatário identificado — não implementado ainda pra preenchimento automático a partir do cliente', 400)
  }
  if (itens.length === 0) {
    throw new EmitirNotaProdutoError('Informe pelo menos um item', 400)
  }

  const produtoIds = itens.map(i => i.produtoId).filter((id): id is string => !!id)

  const [
    { data: config },
    { data: biz },
    { data: certRow },
    { data: produtos },
  ] = await Promise.all([
    supabaseAdmin.from('faturamento_config').select('*').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('businesses').select('document_number, razao_social, name, address_street, address_number, address_neighborhood, address_city, address_state, address_zip, address_complement').eq('id', businessId).single(),
    supabaseAdmin.from('certificados_digitais').select('pfx').eq('business_id', businessId).maybeSingle(),
    produtoIds.length > 0
      ? supabaseAdmin.from('produtos').select('*').in('id', produtoIds).eq('business_id', businessId)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ])

  if (!config?.active) throw new EmitirNotaProdutoError('Faturamento não está ativo pra este negócio', 403)
  if (!certRow) throw new EmitirNotaProdutoError('Nenhum certificado digital cadastrado ainda', 400)
  if (!config.uf) throw new EmitirNotaProdutoError('Configure a UF fiscal do negócio antes de emitir nota de produto', 400)
  if (!config.inscricao_estadual) throw new EmitirNotaProdutoError('Configure a Inscrição Estadual do negócio antes de emitir nota de produto', 400)
  if (!config.municipio_ibge) throw new EmitirNotaProdutoError('Configure o município (código IBGE) antes de emitir', 400)
  if (!biz?.document_number) throw new EmitirNotaProdutoError('CNPJ do negócio não configurado', 400)
  if (!biz.address_street || !biz.address_city) throw new EmitirNotaProdutoError('Complete o endereço do negócio antes de emitir nota de produto', 400)

  type ProdutoRow = { id: string; nome: string; preco_venda_cents: number | null; ncm: string | null; cfop: string | null; unidade: string; origem_mercadoria: string; icms_situacao_tributaria: string | null; aliquota_icms: number | null }
  const produtosById = new Map<string, ProdutoRow>((produtos ?? []).map((p: ProdutoRow) => [p.id, p]))

  const itensResolvidos: NfeItemInput[] = itens.map((item, idx) => {
    const produto = item.produtoId ? produtosById.get(item.produtoId) : undefined
    const descricao = item.descricao ?? produto?.nome
    const ncm = item.ncm ?? produto?.ncm
    const cfop = item.cfop ?? produto?.cfop
    const valorUnitario = item.valorUnitario ?? (produto?.preco_venda_cents != null ? produto.preco_venda_cents / 100 : undefined)

    if (!descricao || !ncm || !cfop || valorUnitario == null) {
      throw new EmitirNotaProdutoError(`Item ${idx + 1}: faltam dados fiscais (descrição/NCM/CFOP/valor) — preencha no produto do catálogo ou informe direto`, 400)
    }

    return {
      numeroItem: idx + 1,
      descricao,
      ncm,
      cfop,
      unidade: produto?.unidade ?? 'UN',
      quantidade: item.quantidade,
      valorUnitario,
      origemMercadoria: produto?.origem_mercadoria ?? '0',
      icmsSituacaoTributaria: produto?.icms_situacao_tributaria ?? '',
      aliquotaIcms: produto?.aliquota_icms ?? null,
    }
  })

  const valorProdutos = itensResolvidos.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)

  const serie = modelo === '55' ? config.serie_nfe : config.serie_nfce
  const { data: numeroRaw, error: numeroError } = await supabaseAdmin.rpc('proximo_numero_nfe', {
    p_business_id: businessId,
    p_modelo: modelo,
    p_serie: serie,
  })
  if (numeroError) throw new EmitirNotaProdutoError(numeroError.message, 500)
  const numero = String(numeroRaw)

  // Grava a nota como 'processando' ANTES de chamar a SEFAZ — mesmo
  // princípio da NFS-e: nunca perder o rastro de uma tentativa mesmo se a
  // chamada falhar no meio do caminho.
  const { data: nota, error: insertError } = await supabaseAdmin
    .from('notas_produto')
    .insert({
      business_id: businessId,
      customer_id: customerId ?? null,
      charge_id: chargeId ?? null,
      modelo,
      serie,
      numero,
      status: 'processando' as NotaProdutoStatus,
      natureza_operacao: naturezaOperacao ?? 'Venda de mercadoria',
      ambiente: config.ambiente,
      valor_produtos: valorProdutos,
      valor_total: valorProdutos,
    })
    .select()
    .single()

  if (insertError) throw new EmitirNotaProdutoError(insertError.message, 500)

  const { error: itensError } = await supabaseAdmin.from('notas_produto_itens').insert(
    itensResolvidos.map(item => ({
      nota_id: nota.id,
      produto_id: itens[item.numeroItem - 1].produtoId ?? null,
      numero_item: item.numeroItem,
      descricao: item.descricao,
      ncm: item.ncm,
      cfop: item.cfop,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valor_unitario: item.valorUnitario,
      valor_total: Number((item.quantidade * item.valorUnitario).toFixed(2)),
      origem_mercadoria: item.origemMercadoria,
      icms_situacao_tributaria: item.icmsSituacaoTributaria,
      aliquota_icms: item.aliquotaIcms,
    }))
  )
  if (itensError) {
    await supabaseAdmin.from('notas_produto').update({ status: 'rejeitada', motivo_rejeicao: itensError.message }).eq('id', nota.id)
    throw new EmitirNotaProdutoError(itensError.message, 500)
  }

  try {
    const { pfxBase64, senha } = decryptJSON<{ pfxBase64: string; senha: string }>((certRow.pfx as { enc: string }).enc)
    const pfxBuffer = Buffer.from(pfxBase64, 'base64')
    const { chavePem, certPem } = extrairChaveECertificado(pfxBuffer, senha)

    const crt = config.regime_tributario === 'normal' ? 3 : 1 // Simples/MEI -> 1, Regime normal -> 3 (2 = Simples com excesso de sublimite, não coberto ainda)

    const { xml, id, chaveAcesso } = montarNfeXml({
      ambiente: config.ambiente as NfeAmbiente,
      modelo,
      uf: config.uf,
      serie,
      numero,
      municipioFatoGeradorIbge: config.municipio_ibge,
      naturezaOperacao: naturezaOperacao ?? 'Venda de mercadoria',
      emitente: {
        documento: biz.document_number.replace(/\D/g, ''),
        razaoSocial: biz.razao_social || biz.name,
        inscricaoEstadual: config.inscricao_estadual,
        crt,
        endereco: {
          logradouro: biz.address_street,
          numero: biz.address_number ?? 'S/N',
          bairro: biz.address_neighborhood ?? '',
          municipioIbge: config.municipio_ibge,
          municipioNome: biz.address_city,
          uf: config.uf,
          cep: biz.address_zip ?? '',
          complemento: biz.address_complement,
        },
      },
      destinatario,
      itens: itensResolvidos,
    })

    const signedXml = assinarNfeXml(xml, id, chavePem, certPem)

    let resultado = await enviarLoteNfe({
      signedXml,
      uf: config.uf,
      modelo,
      ambiente: config.ambiente as NfeAmbiente,
      certificado: { pfxBuffer, senha },
    })

    // Processamento assíncrono — poucas tentativas de poll antes de deixar
    // 'processando' pra reconciliação posterior.
    if (resultado.recibo && !resultado.protocolo) {
      const recibo = resultado.recibo
      const cUFNum = chaveAcesso.slice(0, 2)
      for (let tentativa = 0; tentativa < MAX_TENTATIVAS_POLL && !resultado.protocolo; tentativa++) {
        await sleep(INTERVALO_POLL_MS)
        resultado = await consultarRecibo({
          recibo,
          cUF: cUFNum,
          uf: config.uf,
          modelo,
          ambiente: config.ambiente as NfeAmbiente,
          certificado: { pfxBuffer, senha },
        })
      }
    }

    const autorizada = resultado.cStat === '100'
    const denegada = resultado.cStat === '110' || resultado.cStat === '301' || resultado.cStat === '302'
    const status: NotaProdutoStatus = autorizada ? 'autorizada' : denegada ? 'denegada' : resultado.protocolo ? 'rejeitada' : 'processando'

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('notas_produto')
      .update({
        status,
        chave_acesso: resultado.chaveAcesso ?? chaveAcesso,
        protocolo_autorizacao: resultado.protocolo,
        motivo_rejeicao: autorizada ? null : `${resultado.cStat ?? '?'}: ${resultado.xMotivo ?? 'sem retorno da SEFAZ'}`,
      })
      .eq('id', nota.id)
      .select()
      .single()

    if (updateError) throw new EmitirNotaProdutoError(updateError.message, 500)

    return { nota: updated, sefazResponse: resultado }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao emitir nota de produto'
    await supabaseAdmin.from('notas_produto').update({ status: 'rejeitada', motivo_rejeicao: msg }).eq('id', nota.id)
    if (e instanceof EmitirNotaProdutoError) throw e
    throw new EmitirNotaProdutoError(msg, 502)
  }
}
