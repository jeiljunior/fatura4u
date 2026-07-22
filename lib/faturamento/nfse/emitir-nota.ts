// Orquestra a emissão de uma nota fiscal (monta DPS, assina, envia pro Sefin
// Nacional, grava o resultado) — usado tanto pela emissão manual quanto pela
// automática, disparada quando uma cobrança é confirmada via webhook.
import { createClient } from '@supabase/supabase-js'
import { decryptJSON } from '../crypto'
import { montarDpsXml, proximoNumeroDps } from './dps'
import { assinarDpsXml } from './assinar'
import { emitirDps } from './emitir'
import { extrairChaveECertificado } from './certificado'
import type { NfseAmbiente } from './mtls-client'
import type { InvoiceStatus } from '../types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type EmitirNotaFiscalParams = {
  businessId: string
  customerId: string
  chargeId?: string | null
  valorServicos: number
  descricaoServico: string
}

export class EmitirNotaFiscalError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export async function emitirNotaFiscal(params: EmitirNotaFiscalParams) {
  const { businessId, customerId, chargeId, valorServicos, descricaoServico } = params

  const [
    { data: config },
    { data: biz },
    { data: certRow },
    { data: customer },
  ] = await Promise.all([
    supabaseAdmin.from('faturamento_config').select('*').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('businesses').select('document_type, document_number, razao_social, name').eq('id', businessId).single(),
    supabaseAdmin.from('certificados_digitais').select('pfx').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('customers').select('id, name, document').eq('id', customerId).eq('business_id', businessId).single(),
  ])

  if (!config?.active) throw new EmitirNotaFiscalError('Faturamento não está ativo pra este negócio', 403)
  if (!certRow) throw new EmitirNotaFiscalError('Nenhum certificado digital cadastrado ainda', 400)
  if (!customer) throw new EmitirNotaFiscalError('Cliente não encontrado', 404)
  if (!config.municipio_ibge || !config.codigo_servico_padrao || !config.codigo_nbs || !config.aliquota_iss_padrao || !config.regime_tributario) {
    throw new EmitirNotaFiscalError('Complete a configuração fiscal (município, código de serviço, código NBS, alíquota, regime) antes de emitir', 400)
  }

  const { pfxBase64, senha } = decryptJSON<{ pfxBase64: string; senha: string }>((certRow.pfx as { enc: string }).enc)
  const pfxBuffer = Buffer.from(pfxBase64, 'base64')

  // Cria o registro em 'processando' antes de chamar a ADN, pra nunca perder
  // o rastro de uma emissão mesmo se a chamada falhar no meio.
  const numeroDps = await proximoNumeroDps(businessId, config.serie_dps)

  const { data: invoice, error: insertError } = await supabaseAdmin
    .from('invoices')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      charge_id: chargeId ?? null,
      status: 'processando' as InvoiceStatus,
      valor_servicos: valorServicos,
      codigo_servico: config.codigo_servico_padrao,
      aliquota: config.aliquota_iss_padrao,
    })
    .select()
    .single()

  if (insertError) throw new EmitirNotaFiscalError(insertError.message, 500)

  try {
    const bizDocDigits = (biz!.document_number ?? '').replace(/\D/g, '')
    const customerDocDigits = (customer.document ?? '').replace(/\D/g, '')

    const { xml, id } = montarDpsXml({
      ambiente: config.ambiente as NfseAmbiente,
      serie: config.serie_dps,
      numeroDps,
      dataCompetencia: new Date().toISOString().slice(0, 10),
      municipioIbge: config.municipio_ibge,
      prestador: {
        documento: bizDocDigits,
        tipoDocumento: biz!.document_type === 'cnpj' ? 'cnpj' : 'cpf',
        razaoSocial: biz!.razao_social || biz!.name,
        inscricaoMunicipal: config.inscricao_municipal,
        regime: config.regime_tributario,
      },
      tomador: customerDocDigits
        ? {
            documento: customerDocDigits,
            tipoDocumento: customerDocDigits.length > 11 ? 'cnpj' : 'cpf',
            nome: customer.name,
          }
        : undefined,
      servico: {
        codigoTribNac: config.codigo_servico_padrao,
        codigoNbs: config.codigo_nbs,
        descricao: descricaoServico,
      },
      valores: {
        valorServico: Number(valorServicos),
        aliquotaIss: Number(config.aliquota_iss_padrao),
      },
    })

    const { chavePem, certPem } = extrairChaveECertificado(pfxBuffer, senha)
    const signedXml = assinarDpsXml(xml, id, chavePem, certPem)

    const resultado = await emitirDps(signedXml, { pfxBuffer, senha }, config.ambiente as NfseAmbiente)

    const status: InvoiceStatus = resultado.erros.length > 0
      ? 'rejeitada'
      : resultado.chaveAcesso
        ? 'autorizada'
        : 'processando'

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        status,
        protocolo_adn: resultado.nsuRecepcao,
        chave_acesso: resultado.chaveAcesso,
        motivo_rejeicao: resultado.erros.length > 0 ? resultado.erros.map(e => `${e.codigo}: ${e.descricao}`).join('; ') : null,
      })
      .eq('id', invoice.id)
      .select()
      .single()

    if (updateError) throw new EmitirNotaFiscalError(updateError.message, 500)

    return { invoice: updated, adnResponse: resultado }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao emitir nota fiscal'
    await supabaseAdmin.from('invoices').update({ status: 'rejeitada', motivo_rejeicao: msg }).eq('id', invoice.id)
    if (e instanceof EmitirNotaFiscalError) throw e
    throw new EmitirNotaFiscalError(msg, 502)
  }
}

// Dispara emissão automática quando uma cobrança é confirmada (webhook de
// gateway). Nunca lança — falhas aqui não podem derrubar o webhook do
// gateway (que reenviaria indefinidamente). Silenciosamente não faz nada se
// o módulo não estiver configurado pra emissão automática ainda.
export async function tentarEmitirNotaAutomatica(businessId: string, chargeId: string): Promise<void> {
  try {
    const { data: config } = await supabaseAdmin
      .from('faturamento_config')
      .select('active, emissao_automatica')
      .eq('business_id', businessId)
      .maybeSingle()

    if (!config?.active || !config.emissao_automatica) return

    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('charge_id', chargeId)
      .maybeSingle()

    if (existing) return // já emitida (ou tentada) pra essa cobrança — evita duplicar

    const { data: charge } = await supabaseAdmin
      .from('charges')
      .select('customer_id, valor_cents')
      .eq('id', chargeId)
      .single()

    if (!charge) return

    await emitirNotaFiscal({
      businessId,
      customerId: charge.customer_id,
      chargeId,
      valorServicos: charge.valor_cents / 100,
      descricaoServico: 'Serviço prestado',
    })
  } catch {
    // Erro na emissão automática não deve derrubar o webhook do gateway de
    // pagamento — o tenant vê a nota como 'rejeitada' na tela e pode emitir
    // manualmente depois.
  }
}
