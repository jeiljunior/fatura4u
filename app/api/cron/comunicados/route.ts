import { NextRequest, NextResponse } from 'next/server'
import { enviarLote } from '@/lib/comunicados'

// GET /api/cron/comunicados — 1x/dia (vercel.json). Envia um lote pequeno da
// fila de comunicados (mala direta) em andamento.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const r = await enviarLote()
  return NextResponse.json({ ok: true, ...r })
}
