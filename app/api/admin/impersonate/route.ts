import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { platformAdminOrNull, logAdmin } from '@/lib/platformAdmin'

export async function POST(req: NextRequest) {
  const admin = await platformAdminOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { businessId } = await req.json()
  if (!businessId) return NextResponse.json({ error: 'businessId obrigatório' }, { status: 400 })

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .single()

  if (!biz) return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })

  await logAdmin(admin, 'impersonate.start', biz.id, { business_name: biz.name })

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
