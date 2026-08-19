'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Nota = {
  id: string
  modelo: string
  status: string
  valor_total: number
  chave_acesso: string | null
  motivo_rejeicao: string | null
  customers: { name: string } | { name: string }[] | null
}
type Customer = { id: string; name: string; document: string | null }
type Produto = { id: string; nome: string; ncm: string | null; cfop: string | null; unidade: string; preco_venda_cents: number | null }
type LinhaItem = { produtoId: string; quantidade: string }

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', processando: 'Processando', autorizada: 'Autorizada', rejeitada: 'Rejeitada', denegada: 'Denegada', cancelada: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-500', processando: 'bg-amber-100 text-amber-700',
  autorizada: 'bg-emerald-100 text-emerald-700', rejeitada: 'bg-red-100 text-red-700',
  denegada: 'bg-red-100 text-red-700', cancelada: 'bg-slate-100 text-slate-500',
}
const MODELO_LABEL: Record<string, string> = { '55': 'NF-e', '65': 'NFC-e' }

function customerName(c: Nota['customers']) {
  if (!c) return '—'
  return Array.isArray(c) ? c[0]?.name ?? '—' : c.name
}

export default function NotasProdutoClient({ initialNotas, customers, produtos }: { initialNotas: Nota[]; customers: Customer[]; produtos: Produto[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [modelo, setModelo] = useState<'55' | '65'>('65')
  const [customerId, setCustomerId] = useState('')
  const [itens, setItens] = useState<LinhaItem[]>([{ produtoId: '', quantidade: '1' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Destinatário — só obrigatório na NF-e (55); NFC-e permite consumidor não
  // identificado. Preenchido à mão por enquanto (não temos mapeamento
  // automático de endereço do cliente pra código IBGE do município ainda).
  const [destDoc, setDestDoc] = useState('')
  const [destTipoDoc, setDestTipoDoc] = useState<'cnpj' | 'cpf'>('cnpj')
  const [destNome, setDestNome] = useState('')
  const [destLogradouro, setDestLogradouro] = useState('')
  const [destNumero, setDestNumero] = useState('')
  const [destBairro, setDestBairro] = useState('')
  const [destMunicipioIbge, setDestMunicipioIbge] = useState('')
  const [destMunicipioNome, setDestMunicipioNome] = useState('')
  const [destUf, setDestUf] = useState('')
  const [destCep, setDestCep] = useState('')

  function addLinha() { setItens(list => [...list, { produtoId: '', quantidade: '1' }]) }
  function removeLinha(idx: number) { setItens(list => list.filter((_, i) => i !== idx)) }
  function updateLinha(idx: number, patch: Partial<LinhaItem>) {
    setItens(list => list.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  const total = itens.reduce((s, l) => {
    const produto = produtos.find(p => p.id === l.produtoId)
    const qtd = Number(l.quantidade.replace(',', '.')) || 0
    return s + qtd * ((produto?.preco_venda_cents ?? 0) / 100)
  }, 0)

  function resetForm() {
    setModelo('65'); setCustomerId(''); setItens([{ produtoId: '', quantidade: '1' }])
    setDestDoc(''); setDestNome(''); setDestLogradouro(''); setDestNumero(''); setDestBairro('')
    setDestMunicipioIbge(''); setDestMunicipioNome(''); setDestUf(''); setDestCep('')
  }

  async function handleEmit() {
    const itensValidos = itens.filter(l => l.produtoId && Number(l.quantidade.replace(',', '.')) > 0)
    if (itensValidos.length === 0) { setError('Adicione pelo menos um item com quantidade'); return }
    if (modelo === '55' && (!destDoc || !destNome || !destLogradouro || !destMunicipioIbge || !destUf)) {
      setError('Pra NF-e, preencha os dados do destinatário (documento, nome, endereço completo)')
      return
    }

    setSaving(true); setError('')
    const res = await fetch('/api/faturamento/notas-produto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelo,
        customerId: customerId || undefined,
        itens: itensValidos.map(l => ({ produtoId: l.produtoId, quantidade: Number(l.quantidade.replace(',', '.')) })),
        destinatario: modelo === '55' ? {
          documento: destDoc.replace(/\D/g, ''),
          tipoDocumento: destTipoDoc,
          nome: destNome,
          indIEDest: 9,
          endereco: {
            logradouro: destLogradouro, numero: destNumero || 'S/N', bairro: destBairro,
            municipioIbge: destMunicipioIbge, municipioNome: destMunicipioNome, uf: destUf, cep: destCep,
          },
        } : undefined,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao emitir nota'); return }
    setOpen(false)
    resetForm()
    router.refresh()
  }

  return (
    <div>
      <button onClick={() => setOpen(true)}
        className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4">
        + Emitir nota de produto
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-3 font-semibold">Modelo</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Chave de acesso</th>
            </tr>
          </thead>
          <tbody>
            {initialNotas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhuma nota de produto emitida ainda</td></tr>
            )}
            {initialNotas.map(n => (
              <tr key={n.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-700">{MODELO_LABEL[n.modelo] ?? n.modelo}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{customerName(n.customers)}</td>
                <td className="px-4 py-3 text-slate-700">R$ {n.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[n.status]}`}>{STATUS_LABEL[n.status]}</span>
                  {(n.status === 'rejeitada' || n.status === 'denegada') && n.motivo_rejeicao && (
                    <p className="text-xs text-red-500 mt-1 max-w-xs">{n.motivo_rejeicao}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{n.chave_acesso ? `${n.chave_acesso.slice(0, 12)}…` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Emitir nota de produto</h2>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={modelo} onChange={e => setModelo(e.target.value as '55' | '65')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                  <option value="65">NFC-e — venda ao consumidor final</option>
                  <option value="55">NF-e — venda pra empresa</option>
                </select>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                  <option value="">{modelo === '65' ? 'Cliente (opcional)' : 'Selecione o cliente'}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Itens</p>
                <div className="space-y-2">
                  {itens.map((linha, idx) => {
                    const produto = produtos.find(p => p.id === linha.produtoId)
                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <select value={linha.produtoId} onChange={e => updateLinha(idx, { produtoId: e.target.value })}
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm">
                          <option value="">Selecione o produto</option>
                          {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                        <input value={linha.quantidade} onChange={e => updateLinha(idx, { quantidade: e.target.value })}
                          placeholder="Qtd" className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                        <span className="w-24 text-xs text-slate-400 text-right">
                          {produto?.preco_venda_cents != null ? `R$ ${((produto.preco_venda_cents / 100)).toFixed(2)}` : ''}
                        </span>
                        <button onClick={() => removeLinha(idx)} className="text-slate-400 hover:text-red-500 px-1" aria-label="Remover item">✕</button>
                      </div>
                    )
                  })}
                </div>
                <button onClick={addLinha} className="text-blue-600 hover:underline text-sm mt-2">+ Adicionar item</button>
              </div>

              <p className="text-right text-sm font-semibold text-slate-700">Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>

              {modelo === '55' && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Destinatário (obrigatório na NF-e)</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <select value={destTipoDoc} onChange={e => setDestTipoDoc(e.target.value as 'cnpj' | 'cpf')}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
                      <option value="cnpj">CNPJ</option>
                      <option value="cpf">CPF</option>
                    </select>
                    <input placeholder="Documento" value={destDoc} onChange={e => setDestDoc(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <input placeholder="Nome / Razão social" value={destNome} onChange={e => setDestNome(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <input placeholder="Logradouro" value={destLogradouro} onChange={e => setDestLogradouro(e.target.value)}
                      className="col-span-2 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                    <input placeholder="Número" value={destNumero} onChange={e => setDestNumero(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input placeholder="Bairro" value={destBairro} onChange={e => setDestBairro(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                    <input placeholder="CEP" value={destCep} onChange={e => setDestCep(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input placeholder="Município (nome)" value={destMunicipioNome} onChange={e => setDestMunicipioNome(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                    <input placeholder="Cód. IBGE do município" value={destMunicipioIbge} onChange={e => setDestMunicipioIbge(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                    <input placeholder="UF" value={destUf} onChange={e => setDestUf(e.target.value.toUpperCase())} maxLength={2}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleEmit} disabled={saving}
                className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                {saving ? 'Emitindo...' : 'Emitir'}
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-500 text-sm px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
