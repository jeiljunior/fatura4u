// Motor de cobrança recorrente: gera as charges reais (via criarCobranca) das
// recorrências que vencem hoje, chamado pelo cron diário
// (app/api/cron/cobrancas-recorrentes).
import supabaseAdmin from '@/lib/supabase/admin'
import { criarCobranca } from '@/lib/faturamento/cobranca'
import type { BillingType } from '@/lib/faturamento/types'

type RecurringChargeRow = {
  id: string
  business_id: string
  customer_id: string
  valor_cents: number
  billing_type: BillingType
  description: string | null
  due_day: number
  next_due_date: string
}

// due_day é sempre 1-28 (garantido pelo check da tabela), então cabe em
// qualquer mês — não precisa de lógica de "clamp" pro último dia.
function proximaDataMensal(dataAtual: string, diaVencimento: number): string {
  const [ano, mes] = dataAtual.split('-').map(Number)
  const proximoMes = mes === 12 ? 1 : mes + 1
  const proximoAno = mes === 12 ? ano + 1 : ano
  return `${proximoAno}-${String(proximoMes).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`
}

export async function gerarCobrancasRecorrentesDoDia(): Promise<{ verificadas: number; geradas: number; erros: number }> {
  const hoje = new Date().toISOString().slice(0, 10)

  const { data: recorrencias } = await supabaseAdmin
    .from('recurring_charges')
    .select('id, business_id, customer_id, valor_cents, billing_type, description, due_day, next_due_date')
    .eq('active', true)
    .lte('next_due_date', hoje)

  let geradas = 0
  let erros = 0

  for (const rec of (recorrencias ?? []) as RecurringChargeRow[]) {
    try {
      await criarCobranca({
        businessId: rec.business_id,
        customerId: rec.customer_id,
        valueCents: rec.valor_cents,
        billingType: rec.billing_type,
        dueDate: rec.next_due_date,
        description: rec.description ?? undefined,
        recurringChargeId: rec.id,
      })

      await supabaseAdmin
        .from('recurring_charges')
        .update({ next_due_date: proximaDataMensal(rec.next_due_date, rec.due_day) })
        .eq('id', rec.id)

      geradas++
    } catch {
      // Não avança next_due_date — tenta de novo amanhã (ex: gateway caiu,
      // cliente perdeu o documento cadastrado). O tenant não perde a cobrança,
      // só atrasa um dia.
      erros++
    }
  }

  return { verificadas: recorrencias?.length ?? 0, geradas, erros }
}
