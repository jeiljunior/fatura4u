// "Hoje" em horário de Brasília, como string YYYY-MM-DD — pra comparar com
// colunas `date` (due_date de contas_pagar/charges), que não têm fuso.
// Vercel roda em UTC por padrão, então `new Date()` sem timeZone explícito
// fica até 3h adiantado da meia-noite de Brasília.
export function hojeBRT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

// N dias à frente de "hoje" em BRT, como string YYYY-MM-DD.
export function diasAFrenteBRT(dias: number): string {
  const [ano, mes, dia] = hojeBRT().split('-').map(Number)
  return new Date(ano, mes - 1, dia + dias).toLocaleDateString('en-CA')
}

// Diferença em dias inteiros entre "hoje" (BRT) e uma data YYYY-MM-DD —
// negativo se `dataISO` já passou. Compara datas civis puras (sem hora),
// por isso usa Date.UTC pros dois lados em vez de subtrair Date locais.
export function diasAte(dataISO: string): number {
  const [anoHoje, mesHoje, diaHoje] = hojeBRT().split('-').map(Number)
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const hoje = Date.UTC(anoHoje, mesHoje - 1, diaHoje)
  const alvo = Date.UTC(ano, mes - 1, dia)
  return Math.round((alvo - hoje) / 86400000)
}
