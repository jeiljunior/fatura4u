import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { platformAdminMfaOrNull, logAdmin } from '@/lib/platformAdmin'
import { enfileirar, enviarLote } from '@/lib/comunicados'

// POST /api/admin/comunicados/[id]/enviar — confirmação forte (digitar ENVIAR).
// Monta a fila com todos os usuários e já manda o primeiro lote; o resto sai
// nos próximos dias pelo cron.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await platformAdminMfaOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id } = await params
  const { confirmacao } = await req.json().catch(() => ({}))
  if (confirmacao !== 'ENVIAR') return NextResponse.json({ error: 'Digite ENVIAR para confirmar' }, { status: 400 })

  const { data: c } = await supabaseAdmin.from('comunicados').select('assunto, corpo, status').eq('id', id).maybeSingle()
  if (!c) return NextResponse.json({ error: 'Comunicado não encontrado' }, { status: 404 })
  if (c.status !== 'rascunho') return NextResponse.json({ error: 'Este comunicado já foi enviado ou cancelado' }, { status: 409 })
  if (c.assunto.trim().length < 3 || c.corpo.trim().length < 10) return NextResponse.json({ error: 'Preencha o assunto e o texto antes de enviar' }, { status: 400 })

  const { total, pulados } = await enfileirar(id)
  await logAdmin(admin, 'comunicado.enviado', null, { id, assunto: c.assunto, destinatarios: total - pulados, descadastrados: pulados })

  const lote = await enviarLote()
  return NextResponse.json({ ok: true, destinatarios: total - pulados, descadastrados: pulados, primeiroLote: lote })
}
