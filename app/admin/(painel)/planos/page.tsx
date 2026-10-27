import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { lerPlanos } from '@/lib/planos'
import PlanosClient from './PlanosClient'

export const dynamic = 'force-dynamic'

export default async function PlanosPage() {
  await requirePlatformAdminMfa()
  const config = await lerPlanos()

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">Planos e valores</h2>
      <p className="mb-4 mt-1 max-w-3xl text-sm text-zinc-500">
        Preço mensal e limites de cada plano, e o desconto do plano anual. Toda alteração fica no Registro de ações, com o valor antes e depois.
      </p>
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
        O FATUR4U ainda não vende planos: a página inicial não mostra preços e não existe cobrança de assinatura da plataforma. O que você define aqui fica guardado como base de configuração, mas ainda não muda nada para os clientes.
      </div>
      <PlanosClient config={config} />
    </div>
  )
}
