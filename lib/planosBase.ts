// Tipos, valores padrão e funções PURAS de planos — sem acesso ao banco, pra
// poder ser importado também por componentes de tela (que rodam no navegador).

export type PlanoId = 'gratis' | 'essencial' | 'profissional' | 'personalizado'
export const PLANOS_COM_LIMITES: PlanoId[] = ['gratis', 'essencial', 'profissional']

export type Recurso = { texto: string; em_breve: boolean }

export type Plano = {
  nome: string
  descricao: string
  preco_cents: number | null // null = sem valor definido
  notas_mes: number | null // null = ilimitado
  usuarios: number | null // null = ilimitado
  subtitulo: string
  recursos: Recurso[]
}

export type ConfigPlanos = {
  landing_precos: 'finais' | 'em_definicao'
  contratacao_aberta: boolean
  desconto_anual_pct: number
  planos: Record<PlanoId, Plano>
}

export const PADRAO: ConfigPlanos = {
  landing_precos: 'em_definicao',
  contratacao_aberta: false,
  desconto_anual_pct: 0,
  planos: {
    gratis: { nome: 'Grátis', descricao: 'Para experimentar', preco_cents: 0, notas_mes: null, usuarios: null, subtitulo: 'Para experimentar', recursos: [] },
    essencial: { nome: 'Essencial', descricao: 'Para autônomos e pequenas empresas', preco_cents: null, notas_mes: null, usuarios: null, subtitulo: 'Para autônomos e pequenas empresas', recursos: [] },
    profissional: { nome: 'Profissional', descricao: 'Para equipes com volume constante', preco_cents: null, notas_mes: null, usuarios: null, subtitulo: 'Para equipes com volume constante', recursos: [] },
    personalizado: { nome: 'Personalizado', descricao: 'Plano sob consulta', preco_cents: null, notas_mes: null, usuarios: null, subtitulo: 'Plano sob consulta', recursos: [] },
  },
}

export function precoMensalTexto(cents: number | null): string {
  return cents == null ? 'sem valor definido' : `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

// Preço por mês no plano anual: desconto aplicado e arredondado pra reais
// inteiros (mesma regra do SIGN4U). null quando o plano não tem valor.
export function precoAnual(cents: number | null, descontoPct: number): { total: number; porMes: number } | null {
  if (cents == null || cents <= 0) return null
  const porMes = Math.round((cents * (1 - descontoPct / 100)) / 100) * 100
  return { total: porMes * 12, porMes }
}

export function limiteTexto(n: number | null): string {
  return n == null ? 'Ilimitado' : String(n)
}
