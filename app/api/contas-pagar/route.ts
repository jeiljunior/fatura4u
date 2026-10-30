import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: contas, error } = await supabaseAdmin
    .from('contas_pagar')
    .select('*')
    .eq('business_id', businessId)
    .order('due_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contas })
}

const MESES_RECORRENCIA_VALIDOS = [3, 6, 12, 24, 36]

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 + months, d))
  return date.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { descricao, categoria, valueCents, dueDate, recorrente, recorrenciaMeses } = body

  if (!descricao || !valueCents || !dueDate) {
    return NextResponse.json({ error: 'Descrição, valor e vencimento são obrigatórios' }, { status: 400 })
  }

  if (recorrente) {
    const meses = MESES_RECORRENCIA_VALIDOS.includes(recorrenciaMeses) ? recorrenciaMeses : 12
    const groupId = crypto.randomUUID()
    const rows = Array.from({ length: meses }, (_, i) => ({
      business_id: businessId,
      descricao,
      categoria: categoria || null,
      valor_cents: valueCents,
      due_date: addMonths(dueDate, i),
      recurrence_group_id: groupId,
    }))

    const { data: contas, error } = await supabaseAdmin.from('contas_pagar').insert(rows).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ conta: contas?.[0], contas })
  }

  const { data: conta, error } = await supabaseAdmin
    .from('contas_pagar')
    .insert({
      business_id: businessId,
      descricao,
      categoria: categoria || null,
      valor_cents: valueCents,
      due_date: dueDate,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conta })
}
