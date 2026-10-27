import type { Metadata } from 'next'
import { tokenValido } from '@/lib/comunicados'

export const metadata: Metadata = { title: 'Cancelar inscrição — FATUR4U', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function DescadastrarPage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; ok?: string }> }) {
  const { e = '', t = '', ok } = await searchParams
  const valido = !!e && !!t && tokenValido(e, t)

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Cancelar inscrição</h1>
        {!valido ? (
          <p className="mt-3 text-sm text-zinc-500">Este link não é válido. Use o link que veio no final do e-mail.</p>
        ) : ok ? (
          <p className="mt-3 text-sm text-zinc-600">Pronto. <strong>{e}</strong> não receberá mais comunicados do FATUR4U. Avisos da sua conta, como cobranças, continuam normalmente.</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-zinc-600">Deseja deixar de receber os comunicados do FATUR4U em <strong>{e}</strong>?</p>
            <form action="/api/descadastrar" method="post" className="mt-6">
              <input type="hidden" name="e" value={e} />
              <input type="hidden" name="t" value={t} />
              <button className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white">Sim, cancelar inscrição</button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
