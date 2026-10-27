import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { platformAdminMfaOrNull } from '@/lib/platformAdmin'
import { sendComunicadoEmail } from '@/lib/email'
import { htmlComunicado, urlDescadastro } from '@/lib/comunicados'

// Prévia SEMPRE para o e-mail do administrador logado.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await platformAdminMfaOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!admin.user.email) return NextResponse.json({ error: 'Sua conta não tem e-mail' }, { status: 400 })

  const { id } = await params
  const { data: c } = await supabaseAdmin.from('comunicados').select('assunto, corpo').eq('id', id).maybeSingle()
  if (!c) return NextResponse.json({ error: 'Comunicado não encontrado' }, { status: 404 })
  if (!c.assunto.trim() || !c.corpo.trim()) return NextResponse.json({ error: 'Salve o assunto e o texto antes de enviar a prévia' }, { status: 400 })

  const url = urlDescadastro(admin.user.email)
  const r = await sendComunicadoEmail(admin.user.email, `[Prévia] ${c.assunto}`, htmlComunicado(c.corpo, url), url)
  if (!r.ok) return NextResponse.json({ error: 'O envio falhou. Confira a chave do Resend e o domínio verificado.' }, { status: 502 })
  return NextResponse.json({ ok: true, para: admin.user.email })
}
