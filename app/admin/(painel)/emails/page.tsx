import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { catalogoEmails } from '@/lib/adminEmails'
import PreviaButton from './PreviaButton'

export const dynamic = 'force-dynamic'

export default async function EmailsPage() {
  const { user } = await requirePlatformAdminMfa()
  const emails = catalogoEmails()

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900">E-mails do FATUR4U</h2>
      <p className="mb-4 text-sm text-zinc-500">
        Os e-mails que o sistema envia, com dados de exemplo e o mesmo texto que o cliente recebe. O botão manda uma prévia só para o seu e-mail ({user.email}).
      </p>

      <ol className="space-y-3">
        {emails.map((e, i) => (
          <li key={e.id} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">{i + 1}. {e.titulo}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{e.quando}</p>
                <p className="mt-1 text-sm text-zinc-600">Assunto: {e.assunto}</p>
              </div>
              <PreviaButton id={e.id} />
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-blue-600">Ver e-mail</summary>
              <iframe
                title={e.titulo}
                sandbox=""
                srcDoc={`<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;padding:16px">${e.html}</body>`}
                className="mt-3 h-56 w-full rounded-lg border border-zinc-200 bg-white"
              />
            </details>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-xs text-zinc-400">
        O texto dos lembretes pode ser personalizado por cada negócio em Configurações; aqui aparece o texto padrão. Os e-mails de recuperação de senha são enviados pelo Supabase e não aparecem nesta lista.
      </p>
    </div>
  )
}
