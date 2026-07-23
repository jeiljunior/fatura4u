import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

// Pausar/retomar uma recorrência (não gera charge enquanto active = false)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { active } = await req.json()

  const { error } = await supabaseAdmin
    .from('recurring_charges')
    .update({ active })
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Exclui a recorrência — as charges já geradas por ela continuam no
// histórico (recurring_charge_id só fica null, on delete set null).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('recurring_charges')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
