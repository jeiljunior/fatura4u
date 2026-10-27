import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { platformAdminOrNull, logAdmin } from '@/lib/platformAdmin'

// POST /api/admin/tenant — cadastro manual de tenant pelo super admin, sem passar
// pelo wizard de autocadastro. Mesma lógica de /api/cadastro, chamada pelo admin
// em vez do próprio cliente.
export async function POST(req: NextRequest) {
  const admin = await platformAdminOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { email, senha, fullName, businessName, docType, docNumber, phone } = await req.json()

  if (!email || !senha || !fullName || !businessName) {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
  }

  if (String(senha).length < 6) {
    return NextResponse.json({ error: 'Senha precisa ter pelo menos 6 caracteres.' }, { status: 400 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Não foi possível criar o login.' }, { status: 500 })
  }

  const slug =
    businessName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6)

  const { data: biz, error: bizError } = await supabaseAdmin
    .from('businesses')
    .insert({
      name: businessName,
      slug,
      document_type: docType || null,
      document_number: docNumber ? String(docNumber).replace(/\D/g, '') : null,
      razao_social: docType === 'cnpj' ? businessName : null,
      phone: phone || null,
    })
    .select()
    .single()

  if (bizError || !biz) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: bizError?.message ?? 'Não foi possível criar o tenant.' }, { status: 500 })
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authData.user.id,
    full_name: fullName,
    role: 'owner',
    business_id: biz.id,
  })

  if (profileError) {
    await supabaseAdmin.from('businesses').delete().eq('id', biz.id)
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Não foi possível vincular o usuário ao tenant.' }, { status: 500 })
  }

  // Config de faturamento já ligada ao negócio, igual o /api/cadastro faz.
  await supabaseAdmin.from('faturamento_config').insert({ business_id: biz.id })

  await logAdmin(admin, 'tenant.created', biz.id, { business_name: businessName, owner_email: email })

  return NextResponse.json({ ok: true, id: biz.id })
}
