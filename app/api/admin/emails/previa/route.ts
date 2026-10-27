import { NextRequest, NextResponse } from 'next/server'
import { platformAdminMfaOrNull, logAdmin } from '@/lib/platformAdmin'
import { catalogoEmails } from '@/lib/adminEmails'
import { sendReminderEmail } from '@/lib/email'

// Envia a prévia SEMPRE para o e-mail do próprio administrador logado — o
// destinatário nunca vem do corpo da requisição.
export async function POST(req: NextRequest) {
  const admin = await platformAdminMfaOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id } = await req.json().catch(() => ({ id: null }))
  const email = catalogoEmails().find(e => e.id === id)
  if (!email) return NextResponse.json({ error: 'E-mail desconhecido' }, { status: 400 })
  if (!admin.user.email) return NextResponse.json({ error: 'Sua conta não tem e-mail' }, { status: 400 })

  const ok = await sendReminderEmail(admin.user.email, `[Prévia] ${email.assunto}`, email.html)
  if (!ok) return NextResponse.json({ error: 'O envio falhou. Confira a chave do Resend e o domínio verificado.' }, { status: 502 })

  await logAdmin(admin, 'email.previa_enviada', null, { email: email.id })
  return NextResponse.json({ ok: true, para: admin.user.email })
}
