import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { platformAdminMfaOrNull, logAdmin } from '@/lib/platformAdmin'
import { lerPlanos, salvarPlanos, PADRAO, PLANOS_COM_LIMITES, type PlanoId, type Recurso } from '@/lib/planos'

const IDS: PlanoId[] = ['gratis', 'essencial', 'profissional', 'personalizado']

function inteiroOuNull(v: unknown, max: number): number | null | undefined {
  if (v === null || v === '' || v === undefined) return null
  const n = Number(v)
  if (!Number.isInteger(n) || n < 0 || n > max) return undefined
  return n
}

// PUT /api/admin/planos — uma ação por chamada; toda alteração vai pro
// Registro de ações com o valor antes e depois.
export async function PUT(req: NextRequest) {
  const admin = await platformAdminMfaOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const config = await lerPlanos()
  const erro = (m: string) => NextResponse.json({ error: m }, { status: 400 })

  switch (body.acao) {
    case 'landing': {
      if (body.modo !== 'finais' && body.modo !== 'em_definicao') return erro('Modo inválido')
      const antes = config.landing_precos
      config.landing_precos = body.modo
      await salvarPlanos(config, admin.user.id)
      await logAdmin(admin, 'planos.landing_alterada', null, { antes, depois: body.modo })
      break
    }
    case 'contratacao': {
      const abrir = body.aberta === true
      if (abrir && body.confirmacao !== 'LIBERAR VENDA') return erro('Digite LIBERAR VENDA para confirmar')
      const antes = config.contratacao_aberta
      config.contratacao_aberta = abrir
      await salvarPlanos(config, admin.user.id)
      await logAdmin(admin, 'planos.contratacao_alterada', null, { antes, depois: abrir })
      break
    }
    case 'plano': {
      const id = body.id as PlanoId
      if (!PLANOS_COM_LIMITES.includes(id)) return erro('Plano inválido')
      const preco = inteiroOuNull(body.preco_cents, 10_000_000)
      const notas = inteiroOuNull(body.notas_mes, 1_000_000)
      const usuarios = inteiroOuNull(body.usuarios, 100_000)
      if (preco === undefined || notas === undefined || usuarios === undefined) return erro('Valor inválido')
      const antes = { preco_cents: config.planos[id].preco_cents, notas_mes: config.planos[id].notas_mes, usuarios: config.planos[id].usuarios }
      config.planos[id] = { ...config.planos[id], preco_cents: preco, notas_mes: notas, usuarios }
      await salvarPlanos(config, admin.user.id)
      await logAdmin(admin, 'planos.plano_alterado', null, { plano: id, antes, depois: { preco_cents: preco, notas_mes: notas, usuarios } })
      break
    }
    case 'textos': {
      const id = body.id as PlanoId
      if (!IDS.includes(id)) return erro('Plano inválido')
      const subtitulo = String(body.subtitulo ?? '').trim().slice(0, 120)
      const recursos: Recurso[] = Array.isArray(body.recursos)
        ? body.recursos.slice(0, 12).map((r: { texto?: unknown; em_breve?: unknown }) => ({ texto: String(r.texto ?? '').trim().slice(0, 120), em_breve: r.em_breve === true })).filter((r: Recurso) => r.texto)
        : []
      const antes = { subtitulo: config.planos[id].subtitulo, recursos: config.planos[id].recursos.length }
      config.planos[id] = { ...config.planos[id], subtitulo, recursos }
      await salvarPlanos(config, admin.user.id)
      await logAdmin(admin, 'planos.textos_alterados', null, { plano: id, antes, depois: { subtitulo, recursos: recursos.length } })
      break
    }
    case 'plano_padrao': {
      const id = body.id as PlanoId
      if (!PLANOS_COM_LIMITES.includes(id)) return erro('Plano inválido')
      const antes = { preco_cents: config.planos[id].preco_cents, notas_mes: config.planos[id].notas_mes, usuarios: config.planos[id].usuarios }
      const p = PADRAO.planos[id]
      config.planos[id] = { ...config.planos[id], preco_cents: p.preco_cents, notas_mes: p.notas_mes, usuarios: p.usuarios }
      await salvarPlanos(config, admin.user.id)
      await logAdmin(admin, 'planos.plano_restaurado', null, { plano: id, antes })
      break
    }
    case 'desconto': {
      const pct = Number(body.pct)
      if (!Number.isFinite(pct) || pct < 0 || pct > 90) return erro('O desconto precisa ficar entre 0 e 90%')
      const antes = config.desconto_anual_pct
      config.desconto_anual_pct = pct
      await salvarPlanos(config, admin.user.id)
      await logAdmin(admin, 'planos.desconto_alterado', null, { antes, depois: pct })
      break
    }
    default:
      return erro('Ação desconhecida')
  }

  // A seção de planos da página inicial lê esta configuração.
  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
