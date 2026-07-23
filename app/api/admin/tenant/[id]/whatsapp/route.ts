import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

// PUT /api/admin/tenant/[id]/whatsapp — só super admin. A instância Z-API é
// provisionada manualmente fora do app (mesma lógica do ATEND+ no AGEND4U);
// aqui só se guarda instance/token/phone já existentes e liga/desliga.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('whatsapp_config')
    .upsert({
      business_id: id,
      instance: body.instance || null,
      token: body.token || null,
      phone: body.phone || null,
      active: body.active ?? false,
    }, { onConflict: 'business_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
