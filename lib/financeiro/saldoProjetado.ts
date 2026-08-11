import type { SupabaseClient } from '@supabase/supabase-js'
import { diasAFrenteBRT } from '@/lib/dateBrt'

export interface SaldoProjetadoParams {
  saldoAtualCents: number
  aPagarCents: number
  aReceberCents: number
}

export interface SaldoProjetado extends SaldoProjetadoParams {
  saldoProjetadoCents: number
  negativo: boolean
}

// Saldo projetado = saldo em caixa informado pelo tenant + o que ele tem a
// receber (charges pendentes/confirmadas/vencidas) - o que ele tem a pagar
// (contas_pagar pendentes), tudo dentro da janela de `dias`. Espelha o mesmo
// módulo do agend-plus (ver memória project_futurecash e
// feedback_financeiro_paridade_produtos) — mesma lógica, mesmo schema.
export function calcularSaldoProjetado(params: SaldoProjetadoParams): SaldoProjetado {
  const saldoProjetadoCents = params.saldoAtualCents + params.aReceberCents - params.aPagarCents
  return { ...params, saldoProjetadoCents, negativo: saldoProjetadoCents < 0 }
}

// Busca contas_pagar e charges pendentes com vencimento dentro dos próximos
// `dias` (ou sem vencimento definido, ex. PIX avulso — contam como já
// esperados) e calcula o saldo projetado a partir do saldo atual em caixa.
export async function buscarSaldoProjetado(
  supabase: SupabaseClient,
  businessId: string,
  saldoAtualCents: number,
  dias: number
): Promise<SaldoProjetado> {
  const limite = diasAFrenteBRT(dias)

  const [{ data: contasPagar }, { data: charges }] = await Promise.all([
    supabase
      .from('contas_pagar')
      .select('valor_cents')
      .eq('business_id', businessId)
      .eq('status', 'pendente')
      .or(`due_date.is.null,due_date.lte.${limite}`),
    supabase
      .from('charges')
      .select('valor_cents')
      .eq('business_id', businessId)
      .in('status', ['pendente', 'confirmada', 'vencida'])
      .or(`due_date.is.null,due_date.lte.${limite}`),
  ])

  const aPagarCents = (contasPagar ?? []).reduce((soma: number, c: { valor_cents: number }) => soma + c.valor_cents, 0)
  const aReceberCents = (charges ?? []).reduce((soma: number, c: { valor_cents: number }) => soma + c.valor_cents, 0)

  return calcularSaldoProjetado({ saldoAtualCents, aPagarCents, aReceberCents })
}
