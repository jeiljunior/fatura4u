import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { platformAdminOrNull, logAdmin } from '@/lib/platformAdmin'

// PUT /api/admin/tenant/[id]/whatsapp — só super admin. A instância Z-API é
// provisionada manualmente fora do app (mesma lógica do ATEND+ no AGEND4U);
// aqui só se guarda instance/token/phone já existentes e liga/desliga.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await platformAdminOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

  // O token da instância é segredo — o registro guarda só se mudou, nunca o valor.
  await logAdmin(admin, 'whatsapp.config_updated', id, { active: !!(body.active ?? false), phone: body.phone || null, token_informado: !!body.token })

  return NextResponse.json({ config: data })
}
