import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

async function getBusinessId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single()
  return profile?.business_id ?? null
}

export async function PUT(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const {
    document_type, document_number, razao_social,
    address_zip, address_street, address_number, address_complement,
    address_neighborhood, address_city, address_state,
  } = body

  const { error } = await supabaseAdmin.from('businesses').update({
    document_type, document_number, razao_social,
    address_zip, address_street, address_number, address_complement,
    address_neighborhood, address_city, address_state,
  }).eq('id', businessId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
