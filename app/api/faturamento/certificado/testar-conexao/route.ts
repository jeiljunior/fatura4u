import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { decryptJSON } from '@/lib/faturamento/crypto'
import { testarConexaoAdn } from '@/lib/faturamento/nfse/mtls-client'
import type { NfseAmbiente } from '@/lib/faturamento/nfse/mtls-client'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function POST() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const [{ data: certRow }, { data: config }] = await Promise.all([
    supabaseAdmin.from('certificados_digitais').select('pfx').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('faturamento_config').select('ambiente').eq('business_id', businessId).maybeSingle(),
  ])

  if (!certRow) return NextResponse.json({ error: 'Nenhum certificado cadastrado ainda' }, { status: 400 })

  const { pfxBase64, senha } = decryptJSON<{ pfxBase64: string; senha: string }>((certRow.pfx as { enc: string }).enc)
  const pfxBuffer = Buffer.from(pfxBase64, 'base64')

  try {
    const res = await testarConexaoAdn({ pfxBuffer, senha }, (config?.ambiente ?? 'homologacao') as NfseAmbiente)
    const ok = res.status === 200
    return NextResponse.json({ ok, status: res.status })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao testar conexão' }, { status: 500 })
  }
}
