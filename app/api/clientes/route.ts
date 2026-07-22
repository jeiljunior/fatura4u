import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

async function getBusinessId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single()
  return profile?.business_id as string | null ?? null
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id, name, phone, email, document, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  if (id) {
    const { error } = await supabaseAdmin.from('customers')
      .update({ name, phone, email, document, notes })
      .eq('id', id).eq('business_id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin.from('customers')
      .insert({ business_id: businessId, name, phone, email, document, notes })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('customers').delete().eq('id', id).eq('business_id', businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
