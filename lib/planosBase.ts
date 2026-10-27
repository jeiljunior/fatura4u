// Tipos, valores padrão e funções PURAS de planos — sem acesso ao banco, pra
// poder ser importado também por componentes de tela (que rodam no navegador).

export type PlanoId = 'gratis' | 'essencial' | 'profissional' | 'personalizado'
export const PLANOS_COM_LIMITES: PlanoId[] = ['gratis', 'essencial', 'profissional']
export const PLANO_DESTAQUE: PlanoId = 'profissional'

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

const r = (texto: string, em_breve = false): Recurso => ({ texto, em_breve })

// Textos de partida: só o que o FATUR4U já faz hoje. NF-e/NFC-e ficam com o
// selo "em breve" porque ainda não foram validadas com nota real em produção.
export const PADRAO: ConfigPlanos = {
  landing_precos: 'em_definicao',
  contratacao_aberta: false,
  desconto_anual_pct: 0,
  planos: {
    gratis: {
      nome: 'Grátis', descricao: 'Para experimentar', preco_cents: 0, notas_mes: null, usuarios: null,
      subtitulo: 'Para experimentar',
      recursos: [r('Cadastro de clientes'), r('Cobrança por PIX, boleto e cartão'), r('Emissão de NFS-e Nacional')],
    },
    essencial: {
      nome: 'Essencial', descricao: 'Para autônomos e pequenas empresas', preco_cents: null, notas_mes: null, usuarios: null,
      subtitulo: 'Para autônomos e pequenas empresas',
      recursos: [r('Tudo do plano Grátis'), r('Cobranças recorrentes'), r('Lembretes de cobrança por e-mail e WhatsApp'), r('Contas a pagar e saldo projetado')],
    },
    profissional: {
      nome: 'Profissional', descricao: 'Para equipes com volume constante', preco_cents: null, notas_mes: null, usuarios: null,
      subtitulo: 'Para equipes com volume constante',
      recursos: [r('Tudo do plano Essencial'), r('Importação de clientes por planilha'), r('Notas de produto (NF-e e NFC-e)', true)],
    },
    personalizado: {
      nome: 'Personalizado', descricao: 'Plano sob consulta', preco_cents: null, notas_mes: null, usuarios: null,
      subtitulo: 'Para operações grandes',
      recursos: [r('Tudo do plano Profissional'), r('Condições sob medida para a sua operação')],
    },
  },
}

const REAIS = (cents: number) => `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export function precoMensalTexto(cents: number | null): string {
  return cents == null ? 'sem valor definido' : REAIS(cents)
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

// Frase "Cliente vê: ..." do painel.
export function clienteVe(cents: number | null, descontoPct: number): string {
  if (cents == null) return 'sem valor definido'
  const anual = precoAnual(cents, descontoPct)
  return `${REAIS(cents)} por mês${anual ? `, ou ${REAIS(anual.total)} por ano (${REAIS(anual.porMes)} por mês)` : ''}`
}

// Texto "Padrão do código: ..." do painel.
export function padraoTexto(id: PlanoId): string {
  const p = PADRAO.planos[id]
  const partes = [p.preco_cents == null ? 'sem valor definido' : REAIS(p.preco_cents)]
  partes.push(p.notas_mes == null ? 'notas ilimitadas' : `${p.notas_mes} notas`)
  partes.push(p.usuarios == null ? 'usuários ilimitados' : `${p.usuarios} usuário(s)`)
  return partes.join(', ')
}
