import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { platformAdminMfaOrNull, logAdmin } from '@/lib/platformAdmin'

// POST /api/admin/comunicados — cria um rascunho vazio.
export async function POST() {
  const admin = await platformAdminMfaOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin.from('comunicados').insert({ created_by: admin.user.id }).select('id').single()
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Não foi possível criar' }, { status: 500 })

  await logAdmin(admin, 'comunicado.criado', null, { id: data.id })
  return NextResponse.json({ id: data.id })
}
