import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { encryptJSON } from '@/lib/faturamento/crypto'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

// CSC (Código de Segurança do Contribuinte) — credencial da NFC-e usada pra
// montar o hash do QR Code, obtida pelo próprio tenant direto no portal da
// SEFAZ do seu estado. Rota separada do PUT geral de faturamento_config
// (igual ao certificado digital) pra nunca correr risco de sobrescrever o
// token cifrado sem querer num salvamento de outro campo qualquer.

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

// GET — só diz se já tem CSC configurado, nunca devolve o token
export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('faturamento_config')
    .select('csc_id, csc_token_enc')
    .eq('business_id', businessId)
    .maybeSingle()

  return NextResponse.json({ csc_id: data?.csc_id ?? null, configurado: !!data?.csc_token_enc })
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { cscId, cscToken } = await req.json()
  if (!cscId || !cscToken) {
    return NextResponse.json({ error: 'Informe o ID e o token do CSC' }, { status: 400 })
  }

  const enc = encryptJSON({ cscToken })

  const { error } = await supabaseAdmin
    .from('faturamento_config')
    .upsert({
      business_id: businessId,
      csc_id: cscId,
      csc_token_enc: { enc },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
