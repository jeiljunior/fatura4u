import { NextRequest, NextResponse } from 'next/server'
import { enviarLembretesDoDia } from '@/lib/faturamento/regua'

// GET /api/cron/regua-cobranca — disparado 1x/dia pelo Vercel Cron
// (vercel.json), depois do cron de recorrência. Manda lembrete de WhatsApp/
// e-mail pras cobranças que vencem em breve, hoje, ou já venceram.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resultado = await enviarLembretesDoDia()
  return NextResponse.json({ ok: true, ...resultado })
}
