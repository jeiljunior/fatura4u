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
