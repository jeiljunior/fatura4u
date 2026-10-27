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
      <p className="mb-5 mt-1 max-w-3xl text-sm text-zinc-500">
        Preço mensal e limites de cada plano, e o desconto do plano anual. As mudanças valem na seção Planos da página inicial. Toda alteração fica no Registro de ações, com o valor antes e depois.
      </p>
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
        O FATUR4U ainda não cobra assinatura da plataforma: preços, limites e a chave de contratação aparecem na página inicial, mas ainda não cobram nem bloqueiam nada dentro do app.
      </div>
      <PlanosClient config={config} />
    </div>
  )
}
