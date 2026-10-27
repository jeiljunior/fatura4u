import { redirect } from 'next/navigation'
import { requirePlatformAdmin, sessaoComDoisFatores } from '@/lib/platformAdmin'
import TwoFactorForm from './TwoFactorForm'

export default async function DoisFatoresPage() {
  await requirePlatformAdmin()
  if (await sessaoComDoisFatores()) redirect('/admin')

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Verificação em duas etapas</h1>
        <p className="mb-6 text-sm text-slate-500">
          O painel de administração exige o código do seu aplicativo autenticador.
        </p>
        <TwoFactorForm />
        <form action="/auth/logout" method="post" className="mt-6">
          <button className="text-sm text-slate-400 hover:text-slate-700">Sair</button>
        </form>
      </div>
    </div>
  )
}
