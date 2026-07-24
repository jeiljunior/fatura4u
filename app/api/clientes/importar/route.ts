import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

// POST /api/clientes/importar
// Body: FormData com campo "file" (.xlsx, .xls ou .csv)
// Colunas esperadas (case-insensitive): nome/name, telefone/phone/celular/whatsapp,
// email, documento/cpf/cnpj/document, observacoes/notes
export async function POST(req: NextRequest) {
  const businessId = (await getEffectiveBusinessId())?.businessId ?? null
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
    return NextResponse.json({ error: 'Apenas arquivos .xlsx, .xls ou .csv são aceitos' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  let rows: Record<string, string>[]
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, string>[]
  } catch {
    return NextResponse.json({ error: 'Não foi possível ler o arquivo. Verifique o formato.' }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Planilha vazia ou sem dados' }, { status: 400 })
  }

  // Normaliza cabeçalhos para encontrar colunas independente do nome exato
  function findCol(row: Record<string, string>, patterns: string[]): string {
    const key = Object.keys(row).find(k =>
      patterns.some(p => k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(p))
    )
    return key ? String(row[key] ?? '').trim() : ''
  }

  const customers = rows
    .map(row => ({
      business_id: businessId,
      name: findCol(row, ['nome', 'name', 'cliente']),
      phone: findCol(row, ['telefone', 'phone', 'celular', 'whatsapp', 'fone', 'tel']).replace(/\D/g, ''),
      email: findCol(row, ['email', 'e-mail', 'mail']),
      document: findCol(row, ['documento', 'cpf', 'cnpj', 'document']).replace(/\D/g, ''),
      notes: findCol(row, ['observa', 'notes', 'obs', 'anotac']),
    }))
    .filter(c => c.name && (c.phone || c.document || c.email))

  if (customers.length === 0) {
    return NextResponse.json({
      error: 'Nenhum cliente válido encontrado. A planilha precisa de uma coluna "Nome" e ao menos telefone, e-mail ou documento.'
    }, { status: 400 })
  }

  let inserted = 0
  let updated = 0
  const errors: string[] = []

  for (const c of customers) {
    // Prioriza documento (CPF/CNPJ) como chave de identidade — mais confiável
    // pra cobrança do que telefone. Cai pra telefone se não tiver documento.
    let existingId: string | null = null
    if (c.document) {
      const { data } = await supabaseAdmin
        .from('customers').select('id')
        .eq('business_id', businessId).eq('document', c.document).maybeSingle()
      existingId = data?.id ?? null
    }
    if (!existingId && c.phone) {
      const { data } = await supabaseAdmin
        .from('customers').select('id')
        .eq('business_id', businessId).eq('phone', c.phone).maybeSingle()
      existingId = data?.id ?? null
    }

    if (existingId) {
      const { error } = await supabaseAdmin
        .from('customers')
        .update({
          name: c.name,
          phone: c.phone || undefined,
          email: c.email || undefined,
          document: c.document || undefined,
          notes: c.notes || undefined,
        })
        .eq('id', existingId)
      if (error) errors.push(`${c.name}: ${error.message}`)
      else updated++
    } else {
      const { error } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id: businessId,
          name: c.name,
          phone: c.phone || null,
          email: c.email || null,
          document: c.document || null,
          notes: c.notes || null,
        })
      if (error) errors.push(`${c.name}: ${error.message}`)
      else inserted++
    }
  }

  return NextResponse.json({
    ok: true,
    total: customers.length,
    inserted,
    updated,
    errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
  })
}
