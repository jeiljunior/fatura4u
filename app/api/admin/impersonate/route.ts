import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.super_admin) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { businessId } = await req.json()
  if (!businessId) return NextResponse.json({ error: 'businessId obrigatório' }, { status: 400 })

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .single()

  if (!biz) return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })

  const response = NextResponse.json({ redirectTo: `${req.nextUrl.origin}/dashboard` })

  response.cookies.set('admin_impersonating_business_id', businessId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  })
  response.cookies.set('admin_impersonating', '1', {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('admin_impersonating_business_id')
  response.cookies.delete('admin_impersonating')
  return response
}
