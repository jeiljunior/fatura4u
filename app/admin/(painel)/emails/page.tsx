import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { catalogoEmailsOrdenado } from '@/lib/adminEmails'
import ListaEmails from './ListaEmails'

export const dynamic = 'force-dynamic'

export default async function EmailsPage() {
  const { user } = await requirePlatformAdminMfa()
  const emails = await catalogoEmailsOrdenado()

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">E-mails do FATUR4U</h2>
      <p className="mb-5 mt-1 text-sm text-zinc-500">
        Todos os e-mails que o sistema envia, com dados de exemplo e o mesmo texto que o destinatário recebe. O botão envia uma prévia só para o seu e-mail ({user.email}).
      </p>

      <ListaEmails itens={emails} />

      <p className="mt-6 text-xs text-zinc-500">
        O texto dos lembretes pode ser personalizado por cada empresa em Configurações; aqui aparece o texto padrão. Os e-mails de recuperação de senha são enviados pelo Supabase e não aparecem nesta lista. Hoje todos os e-mails estão só em português.
      </p>
    </div>
  )
}
