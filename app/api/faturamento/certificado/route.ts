import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { encryptJSON } from '@/lib/faturamento/crypto'
import { parseCertificado } from '@/lib/faturamento/nfse/certificado'

async function getBusinessId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  return profile?.business_id ?? null
}

// GET — status do certificado (nunca o arquivo/senha)
export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('certificados_digitais')
    .select('valido_ate, created_at, updated_at')
    .eq('business_id', businessId)
    .maybeSingle()

  return NextResponse.json({ certificado: data })
}

// POST (multipart: arquivo + senha) — valida, cifra e salva o certificado
export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('arquivo')
  const senha = formData.get('senha')

  if (!(file instanceof File) || typeof senha !== 'string' || !senha) {
    return NextResponse.json({ error: 'Envie o arquivo do certificado (.pfx/.p12) e a senha' }, { status: 400 })
  }

  const pfxBuffer = Buffer.from(await file.arrayBuffer())

  let info
  try {
    info = parseCertificado(pfxBuffer, senha)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Certificado inválido'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Confere se o certificado é do mesmo CNPJ do negócio, pra evitar subir o
  // certificado errado (compliance: nota sairia em nome de outra empresa).
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('document_number')
    .eq('id', businessId)
    .single()

  if (info.cnpj && biz?.document_number) {
    const bizDoc = biz.document_number.replace(/\D/g, '')
    if (bizDoc !== info.cnpj) {
      return NextResponse.json({
        error: `Este certificado pertence ao CNPJ ${info.cnpj}, diferente do CNPJ cadastrado no seu negócio (${bizDoc}). Confirme se é o certificado correto antes de subir de novo.`,
      }, { status: 400 })
    }
  }

  const enc = encryptJSON({ pfxBase64: pfxBuffer.toString('base64'), senha })
  const validoAteStr = info.validoAte.toISOString().slice(0, 10)

  const { error } = await supabaseAdmin
    .from('certificados_digitais')
    .upsert({
      business_id: businessId,
      pfx: { enc },
      valido_ate: validoAteStr,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('faturamento_config')
    .update({ certificado_valido_ate: validoAteStr })
    .eq('business_id', businessId)

  return NextResponse.json({ ok: true, validoAte: validoAteStr, cnpj: info.cnpj })
}
