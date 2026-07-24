import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import { maskCEP } from '@/lib/masks'

// POST /api/clientes/importar
// Body: FormData com campo "file" (.xlsx, .xls ou .csv) — ver modelo em
// public/templates/clientes-modelo.xlsx (gerado por scripts/gerar-modelo-clientes.js)
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

  // Converte DD/MM/AAAA ou DD-MM-AAAA para ISO YYYY-MM-DD
  function parseDate(raw: string): string | null {
    const match = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (!match) return null
    const [, d, m, y] = match
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  const customers = rows
    .map(row => {
      const document = findCol(row, ['documento', 'cpf', 'cnpj', 'document']).replace(/\D/g, '')
      const tipoRaw = findCol(row, ['tipo']).toLowerCase()
      const tipo_pessoa = tipoRaw.startsWith('j') || tipoRaw === 'pj'
        ? 'pj'
        : tipoRaw.startsWith('f') || tipoRaw === 'pf'
        ? 'pf'
        : document.length === 14 ? 'pj' : 'pf'
      const cep = findCol(row, ['cep']).replace(/\D/g, '')

      return {
        business_id: businessId,
        tipo_pessoa,
        name: findCol(row, ['razao', 'nome', 'name', 'cliente']),
        phone: findCol(row, ['telefone', 'phone', 'celular', 'whatsapp', 'fone', 'tel']).replace(/\D/g, ''),
        email: findCol(row, ['email', 'e-mail', 'mail']),
        document,
        notes: findCol(row, ['observa', 'notes', 'obs', 'anotac']),
        birth_date: parseDate(findCol(row, ['nascimento', 'birth', 'data_nasc', 'dt_nasc'])),
        inscricao_estadual: findCol(row, ['inscricao estadual', 'inscricaoestadual', 'ie']),
        inscricao_municipal: findCol(row, ['inscricao municipal', 'inscricaomunicipal', 'im']),
        address_zip: cep ? maskCEP(cep) : '',
        address_street: findCol(row, ['rua', 'logradouro', 'street', 'endereco']),
        address_number: findCol(row, ['numero', 'number']),
        address_complement: findCol(row, ['complemento', 'complement']),
        address_neighborhood: findCol(row, ['bairro', 'neighborhood']),
        address_city: findCol(row, ['cidade', 'municipio', 'city']),
        address_state: findCol(row, ['uf', 'estado', 'state']).toUpperCase().slice(0, 2),
      }
    })
    .filter(c => c.name && (c.phone || c.document || c.email))

  if (customers.length === 0) {
    return NextResponse.json({
      error: 'Nenhum cliente válido encontrado. A planilha precisa de uma coluna "Nome/Razão social" e ao menos telefone, e-mail ou documento.'
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

    const fields = {
      name: c.name,
      tipo_pessoa: c.tipo_pessoa,
      phone: c.phone || undefined,
      email: c.email || undefined,
      document: c.document || undefined,
      notes: c.notes || undefined,
      birth_date: c.birth_date || undefined,
      inscricao_estadual: c.inscricao_estadual || undefined,
      inscricao_municipal: c.inscricao_municipal || undefined,
      address_zip: c.address_zip || undefined,
      address_street: c.address_street || undefined,
      address_number: c.address_number || undefined,
      address_complement: c.address_complement || undefined,
      address_neighborhood: c.address_neighborhood || undefined,
      address_city: c.address_city || undefined,
      address_state: c.address_state || undefined,
    }

    if (existingId) {
      const { error } = await supabaseAdmin.from('customers').update(fields).eq('id', existingId)
      if (error) errors.push(`${c.name}: ${error.message}`)
      else updated++
    } else {
      const { error } = await supabaseAdmin.from('customers').insert({ business_id: businessId, ...fields })
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
