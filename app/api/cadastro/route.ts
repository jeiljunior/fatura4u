import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    email, password,
    fullName, razaoSocial, docType, docNumber, birthDate, businessName, phone,
    zip, street, number, complement, neighborhood, city, state,
  } = body

  if (!businessName || !email || !password || !docNumber) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const customerName = docType === 'cnpj' ? razaoSocial : fullName

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (authError) throw new Error(authError.message)
    const userId = authData.user.id

    const slug = businessName.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).slice(2, 6)

    const { data: biz, error: bizError } = await supabaseAdmin.from('businesses').insert({
      name: businessName,
      slug,
      document_type: docType,
      document_number: docNumber?.replace(/\D/g, ''),
      razao_social: docType === 'cnpj' ? razaoSocial : null,
      birth_date: docType === 'cpf' && birthDate ? birthDate : null,
      phone: phone || null,
      address_zip: zip?.replace(/\D/g, '') || null,
      address_street: street || null,
      address_number: number || null,
      address_complement: complement || null,
      address_neighborhood: neighborhood || null,
      address_city: city || null,
      address_state: state || null,
    }).select().single()

    if (bizError) throw new Error(bizError.message)

    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: customerName,
      role: 'owner',
      business_id: biz.id,
    })

    // Cria a config de faturamento já ligada ao negócio, pra Configurações
    // não precisar tratar "linha ainda não existe".
    await supabaseAdmin.from('faturamento_config').insert({ business_id: biz.id })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[Cadastro]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
