'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ClienteFormModal, { Cliente } from '@/components/ClienteFormModal'
import { maskDocument } from '@/lib/masks'

type Charge = {
  id: string
  valor_cents: number
  billing_type: string | null
  status: string
  due_date: string | null
  pix_qr_code: string | null
  boleto_url: string | null
  payment_link: string | null
  customers: { name: string } | { name: string }[] | null
}

type Customer = { id: string; name: string; document: string | null }
type Servico = { id: string; nome: string; descricao: string | null; preco_cents: number | null }

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', confirmada: 'Confirmada', recebida: 'Recebida', vencida: 'Vencida', cancelada: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700', confirmada: 'bg-blue-100 text-blue-700',
  recebida: 'bg-emerald-100 text-emerald-700', vencida: 'bg-red-100 text-red-700', cancelada: 'bg-slate-100 text-slate-500',
}

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function customerName(c: Charge['customers']) {
  if (!c) return '—'
  return Array.isArray(c) ? c[0]?.name ?? '—' : c.name
}

export default function CobrancasClient({ initialCharges, customers, servicos }: { initialCharges: Charge[]; customers: Customer[]; servicos: Servico[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [customerList, setCustomerList] = useState(customers)
  const [terceiroMode, setTerceiroMode] = useState(false)
  const [terceiroDoc, setTerceiroDoc] = useState('')
  const [novoTerceiroInitial, setNovoTerceiroInitial] = useState<Cliente | null>(null)
  const [servicoId, setServicoId] = useState('')
  const [valueReais, setValueReais] = useState('')
  const [billingType, setBillingType] = useState('pix')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState('')

  function handleSelectServico(id: string) {
    setServicoId(id)
    const s = servicos.find(x => x.id === id)
    if (s) {
      setDescription(s.descricao || s.nome)
      if (s.preco_cents != null) setValueReais((s.preco_cents / 100).toFixed(2).replace('.', ','))
    }
  }

  const selectedCustomer = customerList.find(c => c.id === customerId)

  function handleTerceiroDocChange(value: string) {
    const masked = maskDocument(value)
    setTerceiroDoc(masked)
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 11 && digits.length !== 14) { setCustomerId(''); return }

    const found = customerList.find(c => (c.document ?? '').replace(/\D/g, '') === digits)
    if (found) {
      setCustomerId(found.id)
      return
    }

    // Documento completo e não cadastrado ainda — abre o cadastro já com o
    // tipo (PF/PJ) e documento preenchidos, só falta completar o resto.
    setNovoTerceiroInitial({
      id: '', tipo_pessoa: digits.length === 14 ? 'pj' : 'pf', name: '', document: digits,
      birth_date: '', inscricao_estadual: '', inscricao_municipal: '', phone: '', email: '',
      address_zip: '', address_street: '', address_number: '', address_complement: '',
      address_neighborhood: '', address_city: '', address_state: '', notes: '',
    })
  }

  async function handleCopyLink(id: string, link: string) {
    await navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(''), 2000)
  }

  async function handleCreate() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/faturamento/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        valueCents: Math.round(Number(valueReais.replace(',', '.')) * 100),
        billingType,
        dueDate: dueDate || undefined,
        description,
        servicoId: servicoId || undefined,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao criar cobrança'); return }
    setOpen(false)
    setCustomerId(''); setTerceiroMode(false); setTerceiroDoc(''); setServicoId(''); setValueReais(''); setDueDate(''); setDescription('')
    router.refresh()
  }

  return (
    <div>
      <button onClick={() => setOpen(true)}
        className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4">
        + Nova cobrança
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Vencimento</th>
              <th className="px-4 py-3 font-semibold">Link</th>
            </tr>
          </thead>
          <tbody>
            {initialCharges.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma cobrança ainda</td></tr>
            )}
            {initialCharges.map(c => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{customerName(c.customers)}</td>
                <td className="px-4 py-3 text-slate-700">{fmt(c.valor_cents)}</td>
                <td className="px-4 py-3 text-slate-500 uppercase text-xs font-semibold">{c.billing_type}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{c.due_date ?? '—'}</td>
                <td className="px-4 py-3">
                  {c.payment_link ? (
                    <button onClick={() => handleCopyLink(c.id, c.payment_link!)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-semibold">
                      {copiedId === c.id ? 'Copiado!' : 'Copiar link'}
                    </button>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-slate-900 mb-4">Nova cobrança</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Faturar para</label>
                {!terceiroMode && (
                  <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                    <option value="">Selecione o cliente</option>
                    {customerList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}

                <label className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                  <input type="checkbox" checked={terceiroMode} onChange={e => {
                    const checked = e.target.checked
                    setTerceiroMode(checked)
                    setCustomerId('')
                    setTerceiroDoc('')
                  }} />
                  Faturar para um terceiro
                </label>

                {terceiroMode && (
                  <div className="mt-2">
                    {selectedCustomer ? (
                      <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50">
                        <span className="font-medium text-slate-800">{selectedCustomer.name}</span>
                        <button type="button" onClick={() => { setCustomerId(''); setTerceiroDoc('') }}
                          className="text-xs text-slate-400 hover:text-slate-600">trocar</button>
                      </div>
                    ) : (
                      <input
                        placeholder="CPF ou CNPJ do terceiro"
                        value={terceiroDoc}
                        maxLength={18}
                        onChange={e => handleTerceiroDocChange(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                      />
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Se o documento já estiver cadastrado, seleciona sozinho. Se não, abre o cadastro pra completar.
                    </p>
                  </div>
                )}
              </div>
              {servicos.length > 0 && (
                <select value={servicoId} onChange={e => handleSelectServico(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                  <option value="">Serviço (opcional — preenche valor e descrição)</option>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              )}
              <input placeholder="Valor (R$)" value={valueReais} onChange={e => setValueReais(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <select value={billingType} onChange={e => setBillingType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="cartao">Cartão</option>
              </select>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleCreate} disabled={saving || !customerId || !valueReais}
                className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar cobrança'}
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-500 text-sm px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {novoTerceiroInitial && (
        <ClienteFormModal
          initial={novoTerceiroInitial}
          onClose={() => { setNovoTerceiroInitial(null); setTerceiroDoc('') }}
          onSaved={c => {
            setCustomerList(list => [...list, { id: c.id, name: c.name, document: c.document }])
            setCustomerId(c.id)
            setNovoTerceiroInitial(null)
          }}
        />
      )}
    </div>
  )
}
