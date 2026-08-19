'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type Produto = {
  id: string
  codigo: string | null
  nome: string
  descricao: string | null
  embalagem: string | null
  fornecedor: string | null
  preco_custo_cents: number | null
  preco_venda_cents: number | null
  ncm: string | null
  cfop: string | null
  unidade: string
  cest: string | null
  origem_mercadoria: string
  icms_situacao_tributaria: string | null
  aliquota_icms: number | null
  ativo: boolean
}

const EMPTY: Produto = {
  id: '', codigo: '', nome: '', descricao: '', embalagem: '', fornecedor: '',
  preco_custo_cents: null, preco_venda_cents: null, ncm: '', cfop: '', unidade: 'UN',
  cest: '', origem_mercadoria: '0', icms_situacao_tributaria: '', aliquota_icms: null, ativo: true,
}

const ORIGENS: { value: string; label: string }[] = [
  { value: '0', label: '0 — Nacional' },
  { value: '1', label: '1 — Estrangeira, importação direta' },
  { value: '2', label: '2 — Estrangeira, adquirida no mercado interno' },
  { value: '3', label: '3 — Nacional, mais de 40% conteúdo importado' },
  { value: '4', label: '4 — Nacional, produção conforme processos produtivos básicos' },
  { value: '5', label: '5 — Nacional, até 40% conteúdo importado' },
  { value: '6', label: '6 — Estrangeira, importação direta, sem similar nacional' },
  { value: '7', label: '7 — Estrangeira, mercado interno, sem similar nacional' },
  { value: '8', label: '8 — Nacional, mais de 70% conteúdo importado' },
]

function centsToReais(cents: number | null): string {
  return cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',')
}
function reaisToCents(reais: string): number | null {
  const n = Number(reais.replace(',', '.'))
  return reais && !isNaN(n) ? Math.round(n * 100) : null
}

const inp = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm'
const lbl = 'block text-xs font-semibold text-slate-500 mb-1'

export default function ProdutosClient({ initialProdutos }: { initialProdutos: Produto[] }) {
  const router = useRouter()
  const [produtos, setProdutos] = useState(initialProdutos)
  const [form, setForm] = useState<Produto | null>(null)
  const [custoInput, setCustoInput] = useState('')
  const [vendaInput, setVendaInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openNew() { setForm(EMPTY); setCustoInput(''); setVendaInput('') }
  function openEdit(p: Produto) {
    setForm(p)
    setCustoInput(centsToReais(p.preco_custo_cents))
    setVendaInput(centsToReais(p.preco_venda_cents))
  }

  async function handleSave() {
    if (!form || !form.nome) { setError('Preencha o nome do produto'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/faturamento/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        id: form.id || undefined,
        preco_custo_cents: reaisToCents(custoInput),
        preco_venda_cents: reaisToCents(vendaInput),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao salvar produto'); return }
    setProdutos(list => {
      const exists = list.some(p => p.id === data.produto.id)
      return exists ? list.map(p => p.id === data.produto.id ? data.produto : p) : [...list, data.produto].sort((a, b) => a.nome.localeCompare(b.nome))
    })
    setForm(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este produto?')) return
    await fetch('/api/faturamento/produtos', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    setProdutos(list => list.filter(p => p.id !== id))
    router.refresh()
  }

  return (
    <div>
      <button onClick={openNew}
        className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4">
        + Novo produto
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-3 py-2 font-semibold">Código</th>
              <th className="px-3 py-2 font-semibold">Nome</th>
              <th className="px-3 py-2 font-semibold">NCM</th>
              <th className="px-3 py-2 font-semibold">CFOP</th>
              <th className="px-3 py-2 font-semibold">Preço venda</th>
              <th className="px-3 py-2 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Nenhum produto cadastrado ainda</td></tr>
            )}
            {produtos.map(p => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-500 font-mono text-xs">{p.codigo ?? '—'}</td>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {p.nome}
                  {!p.ativo && <span className="ml-2 text-xs text-slate-400">(inativo)</span>}
                </td>
                <td className="px-3 py-2 text-slate-500">{p.ncm ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">{p.cfop ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">{p.preco_venda_cents != null ? `R$ ${centsToReais(p.preco_venda_cents)}` : '—'}</td>
                <td className="px-3 py-2">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">{form.id ? 'Editar produto' : 'Novo produto'}</h3>
              <button onClick={() => setForm(null)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Dados gerais</p>
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Código (SKU)</label>
                  <input className={inp} value={form.codigo ?? ''} onChange={e => setForm({ ...form, codigo: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Nome</label>
                  <input className={inp} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={lbl}>Descrição</label>
                <textarea className={inp} rows={2} value={form.descricao ?? ''} onChange={e => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Embalagem</label>
                  <input className={inp} placeholder="Ex: Caixa c/ 12" value={form.embalagem ?? ''} onChange={e => setForm({ ...form, embalagem: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Fornecedor</label>
                  <input className={inp} value={form.fornecedor ?? ''} onChange={e => setForm({ ...form, fornecedor: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Preço de custo (R$)</label>
                  <input className={inp} placeholder="0,00" value={custoInput} onChange={e => setCustoInput(e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Preço de venda (R$)</label>
                  <input className={inp} placeholder="0,00" value={vendaInput} onChange={e => setVendaInput(e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Unidade</label>
                  <input className={inp} placeholder="UN, KG, CX..." value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} />
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Dados fiscais (NF-e/NFC-e)</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>NCM</label>
                  <input className={inp} value={form.ncm ?? ''} onChange={e => setForm({ ...form, ncm: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>CFOP</label>
                  <input className={inp} value={form.cfop ?? ''} onChange={e => setForm({ ...form, cfop: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Origem da mercadoria</label>
                  <select className={inp} value={form.origem_mercadoria} onChange={e => setForm({ ...form, origem_mercadoria: e.target.value })}>
                    {ORIGENS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>CEST <span className="font-normal text-slate-400">— só se sujeito a ICMS-ST</span></label>
                  <input className={inp} value={form.cest ?? ''} onChange={e => setForm({ ...form, cest: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>CST/CSOSN <span className="font-normal text-slate-400">— conferir com contador</span></label>
                  <input className={inp} value={form.icms_situacao_tributaria ?? ''} onChange={e => setForm({ ...form, icms_situacao_tributaria: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Alíquota ICMS (%)</label>
                  <input className={inp} type="number" step="0.01" value={form.aliquota_icms ?? ''}
                    onChange={e => setForm({ ...form, aliquota_icms: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                Ativo (aparece como opção ao emitir nota de produto)
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
    </div>
  )
}
