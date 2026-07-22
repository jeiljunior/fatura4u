import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('super_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.super_admin) redirect('/dashboard')

  const { data: businesses } = await supabaseAdmin
    .from('businesses')
    .select('id, name, slug, created_at, profiles(id, full_name)')
    .order('created_at', { ascending: false })

  const ids = (businesses ?? []).map(b => b.id)

  const [{ data: customersRows }, { data: chargesRows }, { data: invoicesRows }] = await Promise.all([
    ids.length ? supabaseAdmin.from('customers').select('business_id').in('business_id', ids) : Promise.resolve({ data: [] as { business_id: string }[] }),
    ids.length ? supabaseAdmin.from('charges').select('business_id').in('business_id', ids) : Promise.resolve({ data: [] as { business_id: string }[] }),
    ids.length ? supabaseAdmin.from('invoices').select('business_id').in('business_id', ids) : Promise.resolve({ data: [] as { business_id: string }[] }),
  ])

  function countFor(rows: { business_id: string }[] | null, id: string) {
    return (rows ?? []).filter(r => r.business_id === id).length
  }

  const total = businesses?.length ?? 0
  const totalClientes = customersRows?.length ?? 0
  const totalCobrancas = chargesRows?.length ?? 0
  const totalNotas = invoicesRows?.length ?? 0

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col fixed top-0 left-0 h-full z-10">
        <div className="px-6 py-6 border-b border-slate-700/50">
          <span className="text-white font-black text-xl tracking-tight">
            FATURA<span className="text-blue-400">4U</span>
          </span>
          <span className="mt-2 inline-block text-xs font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
            SUPER ADMIN
          </span>
        </div>
        <div className="px-6 py-5 border-b border-slate-700/50">
          <p className="text-white text-sm font-semibold">{profile.full_name}</p>
          <p className="text-slate-400 text-xs">Administrador geral</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-700/60 text-white text-sm font-medium">
            🏢 Tenants
          </Link>
        </nav>
        <div className="px-4 pb-5 border-t border-slate-700/50 pt-4">
          <form action="/auth/logout" method="post">
            <button className="w-full text-slate-400 hover:text-white text-sm py-2 hover:bg-slate-700/40 rounded-lg transition">
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 ml-64 min-h-screen">

        <div className="bg-white border-b border-slate-200 px-8 py-5">
          <h1 className="text-xl font-bold text-slate-900">Painel Master</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gestão de todos os tenants do FATURA4U</p>
        </div>

        <div className="px-8 py-8">

          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total de negócios', value: total, icon: '🏢', color: 'text-slate-700', bg: 'bg-slate-50' },
              { label: 'Clientes cadastrados', value: totalClientes, icon: '👥', color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Cobranças criadas', value: totalCobrancas, icon: '💲', color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Notas emitidas', value: totalNotas, icon: '🧾', color: 'text-violet-700', bg: 'bg-violet-50' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center text-lg mb-3`}>
                  {card.icon}
                </div>
                <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
                <p className="text-slate-400 text-xs mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Tabela de tenants */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Negócios cadastrados</h3>
              <span className="text-slate-400 text-sm">{total} negócio{total !== 1 ? 's' : ''}</span>
            </div>

            {!businesses || businesses.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p className="text-4xl mb-3">🏢</p>
                <p className="text-sm">Nenhum negócio cadastrado ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-6 py-3 font-semibold">Negócio</th>
                      <th className="text-left px-6 py-3 font-semibold">Responsável</th>
                      <th className="text-left px-6 py-3 font-semibold">Clientes</th>
                      <th className="text-left px-6 py-3 font-semibold">Cobranças</th>
                      <th className="text-left px-6 py-3 font-semibold">Notas</th>
                      <th className="text-left px-6 py-3 font-semibold">Desde</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {businesses.map((b) => {
                      const owner = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
                      return (
                        <tr key={b.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 font-semibold text-slate-900">{b.name}</td>
                          <td className="px-6 py-4 text-slate-600">{owner?.full_name ?? '—'}</td>
                          <td className="px-6 py-4 text-slate-600">{countFor(customersRows, b.id)}</td>
                          <td className="px-6 py-4 text-slate-600">{countFor(chargesRows, b.id)}</td>
                          <td className="px-6 py-4 text-slate-600">{countFor(invoicesRows, b.id)}</td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {new Date(b.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/admin/tenant/${b.id}`}
                              className="text-blue-600 hover:underline text-xs font-medium">
                              Gerenciar →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
