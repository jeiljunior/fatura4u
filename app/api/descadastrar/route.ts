import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { tokenValido } from '@/lib/comunicados'

// Aceita o formulário da página /descadastrar e também o "um clique" que os
// provedores de e-mail fazem pelo cabeçalho List-Unsubscribe (POST na URL).
export async function POST(req: NextRequest) {
  let email = req.nextUrl.searchParams.get('e') ?? ''
  let token = req.nextUrl.searchParams.get('t') ?? ''

  if (!email) {
    const form = await req.formData().catch(() => null)
    email = String(form?.get('e') ?? '')
    token = String(form?.get('t') ?? '')
  }

  if (!email || !token || !tokenValido(email, token)) {
    return NextResponse.json({ error: 'Link inválido' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('comunicado_descadastros').upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: 'Não foi possível concluir. Tente de novo.' }, { status: 500 })

  const wantsHtml = req.headers.get('accept')?.includes('text/html')
  if (wantsHtml) {
    return NextResponse.redirect(new URL(`/descadastrar?e=${encodeURIComponent(email)}&t=${token}&ok=1`, req.nextUrl.origin), 303)
  }
  return NextResponse.json({ ok: true })
}
