import { NextRequest, NextResponse } from 'next/server'
import { platformAdminMfaOrNull, logAdmin } from '@/lib/platformAdmin'
import { recebimentosDoMes, mesValido } from '@/lib/adminData'

// Excel interpreta texto iniciado por = + - @ como fórmula — prefixa com apóstrofo.
function campo(valor: string | number | null): string {
  let s = valor === null ? '' : String(valor)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const reais = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

export async function GET(req: NextRequest) {
  const admin = await platformAdminMfaOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const mes = mesValido(req.nextUrl.searchParams.get('mes'))
  const linhas = await recebimentosDoMes(mes)

  const cabecalho = ['Negócio', 'CNPJ/CPF do negócio', 'Ambiente', 'Pagamentos recebidos', 'Valor recebido (R$)', 'Notas autorizadas', 'Pagamentos sem nota']
  const corpo = linhas.map(l => [
    l.name, l.documento, l.ambiente === 'producao' ? 'Produção' : l.ambiente === 'homologacao' ? 'Homologação' : '',
    l.pagamentos, reais(l.valorCents), l.notas, l.semNota,
  ].map(campo).join(';'))

  // BOM + ; + vírgula decimal: abre direto no Excel brasileiro.
  const csv = '﻿' + [cabecalho.map(campo).join(';'), ...corpo].join('\r\n') + '\r\n'

  await logAdmin(admin, 'recebimentos.csv_baixado', null, { mes, negocios: linhas.length })

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="recebimentos-${mes}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
