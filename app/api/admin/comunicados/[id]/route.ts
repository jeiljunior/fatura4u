import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { platformAdminMfaOrNull } from '@/lib/platformAdmin'

// PATCH /api/admin/comunicados/[id] — salva assunto e texto (só rascunho).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await platformAdminMfaOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id } = await params
  const { assunto, corpo } = await req.json().catch(() => ({}))
  if (typeof assunto !== 'string' || typeof corpo !== 'string') return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  if (assunto.length > 200 || corpo.length > 20000) return NextResponse.json({ error: 'Texto grande demais' }, { status: 400 })

  const { data, error } = await supabaseAdmin.from('comunicados')
    .update({ assunto: assunto.trim(), corpo }).eq('id', id).eq('status', 'rascunho').select('id').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Só é possível editar um rascunho' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
