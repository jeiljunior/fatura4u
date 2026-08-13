import { diasAte } from '@/lib/dateBrt'

export type ItemFuturo = {
  id: string
  tipo: 'pagar' | 'receber'
  descricao: string
  valorCents: number
  dueDate: string | null
}

export type GrupoFuturo = {
  label: string
  items: ItemFuturo[]
}

const FAIXAS: { label: string; ateNDias: number }[] = [
  { label: 'Atrasado', ateNDias: -1 },
  { label: 'Próximos 7 dias', ateNDias: 7 },
  { label: '8 a 15 dias', ateNDias: 15 },
  { label: '16 a 30 dias', ateNDias: 30 },
  { label: 'Depois de 30 dias', ateNDias: Infinity },
]

// Agrupa contas a pagar/receber pendentes numa linha do tempo — a mesma
// ideia do "Futuro" do protótipo FutureCash (ver memória project_futurecash),
// só que unificando pagar e receber na mesma visão em vez de duas listas
// separadas. Espelha lib/financeiro/timeline.ts do agend-plus.
export function agruparPorData(items: ItemFuturo[]): GrupoFuturo[] {
  const porFaixa = new Map<string, ItemFuturo[]>(FAIXAS.map(f => [f.label, []]))
  const semData: ItemFuturo[] = []

  for (const item of items) {
    if (!item.dueDate) {
      semData.push(item)
      continue
    }
    const diff = diasAte(item.dueDate)
    const faixa = FAIXAS.find(f => diff <= f.ateNDias) ?? FAIXAS[FAIXAS.length - 1]
    porFaixa.get(faixa.label)!.push(item)
  }

  const grupos: GrupoFuturo[] = FAIXAS
    .map(f => ({ label: f.label, items: porFaixa.get(f.label)!.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')) }))
    .filter(g => g.items.length > 0)

  if (semData.length > 0) grupos.push({ label: 'Sem data definida', items: semData })

  return grupos
}
