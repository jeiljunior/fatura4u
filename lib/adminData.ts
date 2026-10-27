// Dados do painel de gestão. Só números e dados de conta: nunca lê o `pfx` do
// certificado, nem nome/documento de cliente final, nem conteúdo de nota.
import supabaseAdmin from '@/lib/supabase/admin'
import { diasAte, hojeBRT } from '@/lib/dateBrt'

export type ItemAtencao = {
  chave: string
  tipo: 'nota_rejeitada' | 'cobranca_vencida' | 'certificado' | 'pagamento_sem_nota' | 'config_incompleta'
  titulo: string
  detalhe?: string
  businessId: string
}

export type NegocioResumo = {
  id: string
  name: string
  created_at: string
  responsavel: string | null
  ambiente: string | null
  ativo: boolean
  certificadoValidoAte: string | null
  clientes: number
  cobrancas: number
  notas: number
}

async function contar(tabela: string, businessId: string): Promise<number> {
  const { count } = await supabaseAdmin.from(tabela).select('*', { count: 'exact', head: true }).eq('business_id', businessId)
  return count ?? 0
}

// Primeiro instante do mês corrente em Brasília, como ISO (UTC).
function inicioDoMesBRT(): string {
  const [ano, mes] = hojeBRT().split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, 1, 3, 0, 0)).toISOString()
}

export async function listarNegocios(busca?: string): Promise<NegocioResumo[]> {
  let q = supabaseAdmin.from('businesses').select('id, name, created_at').order('created_at', { ascending: false })
  if (busca) q = q.ilike('name', `%${busca}%`)
  const { data: negocios } = await q
  const lista = negocios ?? []
  if (lista.length === 0) return []
  const ids = lista.map(n => n.id)

  const [{ data: perfis }, { data: configs }, { data: certs }, contagens] = await Promise.all([
    supabaseAdmin.from('profiles').select('business_id, full_name, created_at').in('business_id', ids).order('created_at'),
    supabaseAdmin.from('faturamento_config').select('business_id, ambiente, active').in('business_id', ids),
    supabaseAdmin.from('certificados_digitais').select('business_id, valido_ate').in('business_id', ids),
    Promise.all(ids.map(async id => ({
      id,
      clientes: await contar('customers', id),
      cobrancas: await contar('charges', id),
      notas: (await contar('invoices', id)) + (await contar('notas_produto', id)),
    }))),
  ])

  return lista.map(n => {
    const c = contagens.find(x => x.id === n.id)!
    const cfg = (configs ?? []).find(x => x.business_id === n.id)
    return {
      id: n.id,
      name: n.name,
      created_at: n.created_at,
      responsavel: (perfis ?? []).find(p => p.business_id === n.id)?.full_name ?? null,
      ambiente: cfg?.ambiente ?? null,
      ativo: cfg?.active ?? false,
      certificadoValidoAte: (certs ?? []).find(x => x.business_id === n.id)?.valido_ate ?? null,
      clientes: c.clientes,
      cobrancas: c.cobrancas,
      notas: c.notas,
    }
  })
}

export async function visaoGeral() {
  const inicioMes = inicioDoMesBRT()
  const [
    { count: totalNegocios },
    { data: nfse },
    { data: nfProduto },
    { count: certsVencendo },
  ] = await Promise.all([
    supabaseAdmin.from('businesses').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('invoices').select('valor_servicos').eq('status', 'autorizada').gte('created_at', inicioMes).limit(10000),
    supabaseAdmin.from('notas_produto').select('valor_total').eq('status', 'autorizada').gte('created_at', inicioMes).limit(10000),
    supabaseAdmin.from('certificados_digitais').select('*', { count: 'exact', head: true }).lte('valido_ate', new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)),
  ])

  const valorNfse = (nfse ?? []).reduce((s, n) => s + Number(n.valor_servicos), 0)
  const valorProduto = (nfProduto ?? []).reduce((s, n) => s + Number(n.valor_total), 0)

  return {
    negocios: totalNegocios ?? 0,
    notasNoMes: (nfse?.length ?? 0) + (nfProduto?.length ?? 0),
    valorFaturadoNoMes: valorNfse + valorProduto,
    certificadosVencendo: certsVencendo ?? 0,
  }
}

function resumir(texto: string | null, max = 140): string | undefined {
  if (!texto) return undefined
  return texto.length > max ? texto.slice(0, max) + '…' : texto
}

// Tudo que exige ação do administrador hoje, sem abrir dado de cliente final.
export async function listaAtencao(): Promise<ItemAtencao[]> {
  const itens: ItemAtencao[] = []
  const hoje = hojeBRT()
  const ha30dias = new Date(Date.now() - 30 * 86400000).toISOString()
  const ontem = new Date(Date.now() - 86400000).toISOString()

  const [
    { data: negocios },
    { data: rejeitadas },
    { data: produtoRejeitadas },
    { data: vencidas },
    { data: certs },
    { data: configs },
    { data: pagas },
    { data: notasComCobranca },
  ] = await Promise.all([
    supabaseAdmin.from('businesses').select('id, name'),
    supabaseAdmin.from('invoices').select('id, business_id, motivo_rejeicao').eq('status', 'rejeitada').gte('created_at', ha30dias).limit(500),
    supabaseAdmin.from('notas_produto').select('id, business_id, motivo_rejeicao').eq('status', 'rejeitada').gte('created_at', ha30dias).limit(500),
    supabaseAdmin.from('charges').select('business_id').in('status', ['pendente', 'vencida']).lt('due_date', hoje).limit(5000),
    supabaseAdmin.from('certificados_digitais').select('business_id, valido_ate'),
    supabaseAdmin.from('faturamento_config').select('business_id, active, emissao_automatica, municipio_ibge, codigo_servico_padrao, codigo_nbs, regime_tributario'),
    supabaseAdmin.from('charges').select('id, business_id').in('status', ['recebida', 'confirmada']).lt('paid_at', ontem).limit(5000),
    supabaseAdmin.from('invoices').select('charge_id').not('charge_id', 'is', null).limit(10000),
  ])

  const nome = (id: string) => (negocios ?? []).find(n => n.id === id)?.name ?? 'Negócio removido'

  for (const n of rejeitadas ?? []) {
    itens.push({ chave: `nfse-${n.id}`, tipo: 'nota_rejeitada', titulo: `NFS-e rejeitada — ${nome(n.business_id)}`, detalhe: resumir(n.motivo_rejeicao), businessId: n.business_id })
  }
  for (const n of produtoRejeitadas ?? []) {
    itens.push({ chave: `nfp-${n.id}`, tipo: 'nota_rejeitada', titulo: `NF-e/NFC-e rejeitada — ${nome(n.business_id)}`, detalhe: resumir(n.motivo_rejeicao), businessId: n.business_id })
  }

  const vencidasPorNegocio = new Map<string, number>()
  for (const c of vencidas ?? []) vencidasPorNegocio.set(c.business_id, (vencidasPorNegocio.get(c.business_id) ?? 0) + 1)
  for (const [id, qtd] of vencidasPorNegocio) {
    itens.push({ chave: `venc-${id}`, tipo: 'cobranca_vencida', titulo: `${qtd} cobrança${qtd > 1 ? 's' : ''} em atraso — ${nome(id)}`, businessId: id })
  }

  for (const c of certs ?? []) {
    if (!c.valido_ate) continue
    const dias = diasAte(c.valido_ate)
    if (dias <= 30) {
      itens.push({
        chave: `cert-${c.business_id}`, tipo: 'certificado', businessId: c.business_id,
        titulo: dias < 0 ? `Certificado vencido — ${nome(c.business_id)}` : `Certificado vence em ${dias} dia${dias === 1 ? '' : 's'} — ${nome(c.business_id)}`,
      })
    }
  }

  const comNota = new Set((notasComCobranca ?? []).map(n => n.charge_id))
  const ativos = new Set((configs ?? []).filter(c => c.active).map(c => c.business_id))
  const semNotaPorNegocio = new Map<string, number>()
  for (const c of pagas ?? []) {
    if (ativos.has(c.business_id) && !comNota.has(c.id)) semNotaPorNegocio.set(c.business_id, (semNotaPorNegocio.get(c.business_id) ?? 0) + 1)
  }
  for (const [id, qtd] of semNotaPorNegocio) {
    itens.push({ chave: `semnota-${id}`, tipo: 'pagamento_sem_nota', titulo: `${qtd} pagamento${qtd > 1 ? 's' : ''} recebido${qtd > 1 ? 's' : ''} sem nota — ${nome(id)}`, businessId: id })
  }

  for (const c of configs ?? []) {
    if (!c.active) continue
    const faltando = [
      !c.municipio_ibge && 'município', !c.codigo_servico_padrao && 'código de serviço',
      !c.codigo_nbs && 'código NBS', !c.regime_tributario && 'regime tributário',
    ].filter(Boolean)
    if (faltando.length) {
      itens.push({ chave: `cfg-${c.business_id}`, tipo: 'config_incompleta', titulo: `Configuração fiscal incompleta — ${nome(c.business_id)}`, detalhe: `Falta: ${faltando.join(', ')}`, businessId: c.business_id })
    }
  }

  return itens
}

export type LinhaAuditoria = {
  id: string
  action: string
  admin_email: string | null
  business_id: string | null
  businessName: string | null
  negocioExiste: boolean
  meta: Record<string, unknown>
  created_at: string
}

export async function ultimasAcoes(limite = 100): Promise<LinhaAuditoria[]> {
  const { data } = await supabaseAdmin
    .from('admin_audit')
    .select('id, action, admin_email, business_id, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(limite)
  const linhas = data ?? []

  const ids = [...new Set(linhas.map(l => l.business_id).filter((x): x is string => !!x))]
  const { data: negocios } = ids.length
    ? await supabaseAdmin.from('businesses').select('id, name').in('id', ids)
    : { data: [] as { id: string; name: string }[] }

  return linhas.map(l => {
    const atual = (negocios ?? []).find(n => n.id === l.business_id)
    return {
      ...l,
      meta: (l.meta ?? {}) as Record<string, unknown>,
      // Negócio excluído: o nome sobrevive no próprio registro (meta.business_name).
      businessName: atual?.name ?? ((l.meta as { business_name?: string })?.business_name ?? null),
      negocioExiste: !!atual,
    }
  })
}

// ── Recebimentos (agregado por negócio, sem dados de cliente final) ──────────

export function mesAtualBRT(): string {
  return hojeBRT().slice(0, 7)
}

export function mesValido(mes: string | undefined | null): string {
  return mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : mesAtualBRT()
}

export function deslocarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(ano, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(ano, m - 1, 1, 12)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Intervalo do mês em Brasília (UTC-3, sem horário de verão), como ISO UTC.
function intervaloMesBRT(mes: string): { inicio: string; fim: string } {
  const [ano, m] = mes.split('-').map(Number)
  return {
    inicio: new Date(Date.UTC(ano, m - 1, 1, 3)).toISOString(),
    fim: new Date(Date.UTC(ano, m, 1, 3)).toISOString(),
  }
}

export type RecebimentoNegocio = {
  id: string
  name: string
  documento: string | null
  ambiente: string | null
  pagamentos: number
  valorCents: number
  notas: number
  semNota: number
}

export async function recebimentosDoMes(mes: string): Promise<RecebimentoNegocio[]> {
  const { inicio, fim } = intervaloMesBRT(mes)

  const [
    { data: negocios },
    { data: pagos },
    { data: nfse },
    { data: nfProduto },
    { data: comNota },
    { data: configs },
  ] = await Promise.all([
    supabaseAdmin.from('businesses').select('id, name, document_number'),
    supabaseAdmin.from('charges').select('id, business_id, valor_cents').in('status', ['recebida', 'confirmada']).gte('paid_at', inicio).lt('paid_at', fim).limit(10000),
    supabaseAdmin.from('invoices').select('business_id').eq('status', 'autorizada').gte('created_at', inicio).lt('created_at', fim).limit(10000),
    supabaseAdmin.from('notas_produto').select('business_id').eq('status', 'autorizada').gte('created_at', inicio).lt('created_at', fim).limit(10000),
    supabaseAdmin.from('invoices').select('charge_id').not('charge_id', 'is', null).limit(10000),
    supabaseAdmin.from('faturamento_config').select('business_id, ambiente'),
  ])

  const comNotaSet = new Set((comNota ?? []).map(n => n.charge_id))

  return (negocios ?? [])
    .map(n => {
      const pagosDoNegocio = (pagos ?? []).filter(p => p.business_id === n.id)
      return {
        id: n.id,
        name: n.name,
        documento: n.document_number,
        ambiente: (configs ?? []).find(c => c.business_id === n.id)?.ambiente ?? null,
        pagamentos: pagosDoNegocio.length,
        valorCents: pagosDoNegocio.reduce((s, p) => s + p.valor_cents, 0),
        notas: (nfse ?? []).filter(x => x.business_id === n.id).length + (nfProduto ?? []).filter(x => x.business_id === n.id).length,
        semNota: pagosDoNegocio.filter(p => !comNotaSet.has(p.id)).length,
      }
    })
    .sort((a, b) => b.valorCents - a.valorCents || a.name.localeCompare(b.name))
}
