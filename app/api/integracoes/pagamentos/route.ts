import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { chaveDoCabecalho, hashChave } from '@/lib/integracao/tokens'

// Recebe, de um sistema externo (ex.: SIGN4U), um pagamento confirmado. Cria ou atualiza o cliente (pelo CPF/CNPJ) e guarda a nota
// como "a emitir" (rascunho). Quem emite é a pessoa, na tela Notas Fiscais. Autenticação: "Authorization: Bearer <chave de integração>";
// a chave define a empresa emissora. O mesmo (origem, referencia) nunca gera duas notas.
//
// Corpo (JSON): { origem, referencia, pago_em?, valor_cents, descricao, cliente: { nome, documento, email?, telefone?, tipo_pessoa?,
//   inscricao_estadual?, data_nascimento?, cep?, logradouro?, numero?, complemento?, bairro?, cidade?, uf? } }
const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '')
const text = (v: unknown, max: number) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  return s || null
}

export async function POST(req: NextRequest) {
  const chave = chaveDoCabecalho(req.headers.get('authorization'))
  if (!chave) return NextResponse.json({ error: 'Chave de integração ausente ou inválida' }, { status: 401 })

  const { data: tk } = await supabaseAdmin
    .from('integration_tokens')
    .select('id, business_id, active')
    .eq('token_hash', hashChave(chave))
    .maybeSingle()
  if (!tk || !tk.active) return NextResponse.json({ error: 'Chave de integração ausente ou inválida' }, { status: 401 })
  const businessId = tk.business_id as string

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })

  const origem = String(body.origem ?? '').toLowerCase()
  const referencia = String(body.referencia ?? '').trim()
  const valorCents = Number(body.valor_cents)
  const descricao = text(body.descricao, 300)
  const c = (body.cliente ?? {}) as Record<string, unknown>
  const doc = digits(c.documento)
  const nome = text(c.nome, 150)

  if (!/^[a-z0-9_-]{2,30}$/.test(origem)) return NextResponse.json({ error: 'origem inválida (2 a 30 letras minúsculas, números, _ ou -)' }, { status: 400 })
  if (!referencia || referencia.length > 100) return NextResponse.json({ error: 'referencia obrigatória (até 100 caracteres)' }, { status: 400 })
  if (!Number.isInteger(valorCents) || valorCents <= 0 || valorCents > 100_000_000_00) return NextResponse.json({ error: 'valor_cents deve ser um inteiro positivo' }, { status: 400 })
  if (!descricao) return NextResponse.json({ error: 'descricao obrigatória' }, { status: 400 })
  if (!nome) return NextResponse.json({ error: 'cliente.nome obrigatório' }, { status: 400 })
  if (doc.length !== 11 && doc.length !== 14) return NextResponse.json({ error: 'cliente.documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos)' }, { status: 400 })
  const pagoEm = body.pago_em ? new Date(String(body.pago_em)) : new Date()
  if (Number.isNaN(pagoEm.getTime())) return NextResponse.json({ error: 'pago_em inválido' }, { status: 400 })

  // já recebido antes: devolve a nota existente, sem duplicar
  const { data: existente } = await supabaseAdmin
    .from('invoices')
    .select('id, customer_id, status')
    .eq('business_id', businessId)
    .eq('origem', origem)
    .eq('origem_ref', referencia)
    .maybeSingle()
  if (existente) return NextResponse.json({ ok: true, duplicada: true, nota_id: existente.id, cliente_id: existente.customer_id, status: existente.status })

  // cliente: o mesmo CPF/CNPJ da empresa é reaproveitado e completado com o que veio
  const campos = {
    name: nome,
    tipo_pessoa: doc.length === 14 || c.tipo_pessoa === 'pj' ? 'pj' : 'pf',
    email: text(c.email, 200),
    phone: digits(c.telefone) || null,
    inscricao_estadual: text(c.inscricao_estadual, 30),
    birth_date: /^\d{4}-\d{2}-\d{2}$/.test(String(c.data_nascimento ?? '')) ? String(c.data_nascimento) : null,
    address_zip: digits(c.cep) || null,
    address_street: text(c.logradouro, 150),
    address_number: text(c.numero, 20),
    address_complement: text(c.complemento, 80),
    address_neighborhood: text(c.bairro, 80),
    address_city: text(c.cidade, 80),
    address_state: text(c.uf, 2)?.toUpperCase() ?? null,
  }
  let customerId: string
  const { data: cli } = await supabaseAdmin.from('customers').select('id').eq('business_id', businessId).eq('document', doc).limit(1).maybeSingle()
  if (cli) {
    customerId = cli.id
    const preenchidos = Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== null && v !== ''))
    await supabaseAdmin.from('customers').update(preenchidos).eq('id', customerId).eq('business_id', businessId)
  } else {
    const { data: novo, error } = await supabaseAdmin.from('customers').insert({ business_id: businessId, document: doc, ...campos }).select('id').single()
    if (error || !novo) return NextResponse.json({ error: 'Não foi possível cadastrar o cliente' }, { status: 500 })
    customerId = novo.id
  }

  const { data: nota, error: errNota } = await supabaseAdmin
    .from('invoices')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      status: 'rascunho',
      valor_servicos: valorCents / 100,
      origem,
      origem_ref: referencia,
      descricao_servico: descricao,
      pago_em: pagoEm.toISOString(),
    })
    .select('id')
    .single()
  if (errNota) {
    // duas chamadas ao mesmo tempo: a outra venceu, devolve a nota dela
    if (errNota.code === '23505') {
      const { data: outra } = await supabaseAdmin.from('invoices').select('id').eq('business_id', businessId).eq('origem', origem).eq('origem_ref', referencia).maybeSingle()
      if (outra) return NextResponse.json({ ok: true, duplicada: true, nota_id: outra.id, cliente_id: customerId })
    }
    return NextResponse.json({ error: 'Não foi possível registrar a nota' }, { status: 500 })
  }

  await supabaseAdmin.from('integration_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tk.id)
  return NextResponse.json({ ok: true, duplicada: false, nota_id: nota.id, cliente_id: customerId })
}
