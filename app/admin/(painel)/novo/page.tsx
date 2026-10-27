import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import NovoTenantForm from './NovoTenantForm'

export default async function NovoTenantPage() {
  await requirePlatformAdminMfa()

  return (
    <div className="max-w-md">
      <Link href="/admin/empresas" className="text-sm text-zinc-500 hover:text-zinc-900">← Empresas</Link>
      <h2 className="mb-1 mt-2 text-xl font-semibold text-zinc-900">Cadastrar empresa</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Cria o login e a empresa diretamente, sem passar pelo wizard de autocadastro.
      </p>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <NovoTenantForm />
      </div>
    </div>
  )
}
