import { NextRequest, NextResponse } from 'next/server'
import { gerarCobrancasRecorrentesDoDia } from '@/lib/faturamento/recorrencia'

// GET /api/cron/cobrancas-recorrentes — disparado 1x/dia pelo Vercel Cron
// (vercel.json). Gera as cobranças reais das recorrências que vencem hoje.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resultado = await gerarCobrancasRecorrentesDoDia()
  return NextResponse.json({ ok: true, ...resultado })
}
