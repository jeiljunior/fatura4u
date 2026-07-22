import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { decryptJSON } from '@/lib/faturamento/crypto'
import { nfseRequest } from '@/lib/faturamento/nfse/mtls-client'
import type { NfseAmbiente } from '@/lib/faturamento/nfse/mtls-client'

// GET /api/faturamento/invoices/[id]/danfse — proxy: busca o PDF do DANFSe na
// ADN usando o certificado do tenant (o navegador do tenant não tem o
// certificado, então não pode chamar a ADN direto).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single()
  const businessId = profile?.business_id
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params

  const [{ data: invoice }, { data: certRow }, { data: config }] = await Promise.all([
    supabaseAdmin.from('invoices').select('chave_acesso').eq('id', id).eq('business_id', businessId).single(),
    supabaseAdmin.from('certificados_digitais').select('pfx').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('faturamento_config').select('ambiente').eq('business_id', businessId).maybeSingle(),
  ])

  if (!invoice?.chave_acesso) return NextResponse.json({ error: 'Nota ainda não tem chave de acesso' }, { status: 404 })
  if (!certRow) return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 400 })

  const { pfxBase64, senha } = decryptJSON<{ pfxBase64: string; senha: string }>((certRow.pfx as { enc: string }).enc)
  const ambiente = (config?.ambiente as NfseAmbiente) ?? 'homologacao'

  const res = await nfseRequest({
    ambiente,
    path: `/danfse/${invoice.chave_acesso}`,
    method: 'GET',
    certificado: { pfxBuffer: Buffer.from(pfxBase64, 'base64'), senha },
  })

  if (res.status !== 200) {
    return NextResponse.json({ error: `DANFSe indisponível (status ${res.status})` }, { status: 502 })
  }

  return new NextResponse(new Uint8Array(res.bodyBuffer), { headers: { 'Content-Type': 'application/pdf' } })
}
