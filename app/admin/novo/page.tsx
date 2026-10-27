import { requirePlatformAdmin } from '@/lib/platformAdmin'
import NovoTenantForm from './NovoTenantForm'

export default async function NovoTenantPage() {
  await requirePlatformAdmin()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <a href="/admin" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-700">
          ← Tenants
        </a>
        <h1 className="mb-1 text-xl font-bold text-slate-900">Cadastrar tenant</h1>
        <p className="mb-6 text-sm text-slate-500">
          Cria o login e o negócio diretamente — sem passar pelo wizard de autocadastro.
        </p>

        <NovoTenantForm />
      </div>
    </div>
  )
}
