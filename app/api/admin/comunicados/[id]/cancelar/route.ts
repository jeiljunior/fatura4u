import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { platformAdminMfaOrNull, logAdmin } from '@/lib/platformAdmin'

// Cancela um comunicado em andamento: o que ainda estava na fila não sai.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await platformAdminMfaOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id } = await params
  const { data, error } = await supabaseAdmin.from('comunicados').update({ status: 'cancelado' }).eq('id', id).eq('status', 'enviando').select('assunto').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Só dá para cancelar um envio em andamento' }, { status: 409 })

  await supabaseAdmin.from('comunicado_envios').update({ status: 'pulado' }).eq('comunicado_id', id).eq('status', 'na_fila')
  await logAdmin(admin, 'comunicado.cancelado', null, { id, assunto: data.assunto })
  return NextResponse.json({ ok: true })
}
