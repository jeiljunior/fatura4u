'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CollapsibleSection from '@/components/CollapsibleSection'

export type Servico = {
  id: string
  nome: string
  descricao: string | null
  preco_cents: number | null
  codigo_servico: string | null
  aliquota_iss: number | null
  ativo: boolean
}

const EMPTY: Servico = { id: '', nome: '', descricao: '', preco_cents: null, codigo_servico: '', aliquota_iss: null, ativo: true }

function centsToReais(cents: number | null): string {
  return cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',')
}
function reaisToCents(reais: string): number | null {
  const n = Number(reais.replace(',', '.'))
  return reais && !isNaN(n) ? Math.round(n * 100) : null
}

const inp = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm'
const lbl = 'block text-xs font-semibold text-slate-500 mb-1'

export default function ServicosSection({ initialServicos }: { initialServicos: Servico[] }) {
  const router = useRouter()
  const [servicos, setServicos] = useState(initialServicos)
  const [form, setForm] = useState<Servico | null>(null)
  const [precoInput, setPrecoInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openNew() { setForm(EMPTY); setPrecoInput('') }
  function openEdit(s: Servico) { setForm(s); setPrecoInput(centsToReais(s.preco_cents)) }

  async function handleSave() {
    if (!form || !form.nome) { setError('Preencha o nome do serviço'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/faturamento/servicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        id: form.id || undefined,
        preco_cents: reaisToCents(precoInput),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao salvar serviço'); return }
    setServicos(list => {
      const exists = list.some(s => s.id === data.servico.id)
      return exists ? list.map(s => s.id === data.servico.id ? data.servico : s) : [...list, data.servico].sort((a, b) => a.nome.localeCompare(b.nome))
    })
    setForm(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este serviço?')) return
    await fetch('/api/faturamento/servicos', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    setServicos(list => list.filter(s => s.id !== id))
    router.refresh()
  }

  return (
    <CollapsibleSection title="Serviços oferecidos"
      subtitle="Cadastre os serviços que você presta — escolha um deles ao criar cobrança/nota pra preencher valor, descrição e dados fiscais automaticamente.">
      <button onClick={openNew}
        className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4">
        + Novo serviço
      </button>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-3 py-2 font-semibold">Nome</th>
              <th className="px-3 py-2 font-semibold">Preço</th>
              <th className="px-3 py-2 font-semibold">Código LC116</th>
              <th className="px-3 py-2 font-semibold">ISS</th>
              <th className="px-3 py-2 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {servicos.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Nenhum serviço cadastrado ainda</td></tr>
            )}
            {servicos.map(s => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-800">
                  {s.nome}
                  {!s.ativo && <span className="ml-2 text-xs text-slate-400">(inativo)</span>}
                </td>
                <td className="px-3 py-2 text-slate-500">{s.preco_cents != null ? `R$ ${centsToReais(s.preco_cents)}` : '—'}</td>
                <td className="px-3 py-2 text-slate-500">{s.codigo_servico ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">{s.aliquota_iss != null ? `${s.aliquota_iss}%` : '—'}</td>
                <td className="px-3 py-2">
                  <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">{form.id ? 'Editar serviço' : 'Novo serviço'}</h3>
              <button onClick={() => setForm(null)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Nome</label>
                <input className={inp} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <label className={lbl}>Descrição</label>
                <textarea className={inp} rows={2} value={form.descricao ?? ''} onChange={e => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Preço padrão (R$)</label>
                  <input className={inp} placeholder="0,00" value={precoInput} onChange={e => setPrecoInput(e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Alíquota ISS (%)</label>
                  <input className={inp} type="number" step="0.01" value={form.aliquota_iss ?? ''}
                    onChange={e => setForm({ ...form, aliquota_iss: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className={lbl}>Código de serviço (LC 116) <span className="font-normal text-slate-400">— opcional, usa o padrão geral se vazio</span></label>
                <input className={inp} value={form.codigo_servico ?? ''} onChange={e => setForm({ ...form, codigo_servico: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                Ativo (aparece como opção ao criar cobrança/nota)
              </label>
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setForm(null)} className="text-slate-500 text-sm px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </CollapsibleSection>
  )
}
