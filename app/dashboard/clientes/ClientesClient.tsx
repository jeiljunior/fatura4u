'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  notes: string | null
}

const EMPTY: Customer = { id: '', name: '', phone: '', email: '', document: '', notes: '' }

export default function ClientesClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const router = useRouter()
  const [form, setForm] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form) return
    setSaving(true)
    await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.id ? form : { ...form, id: undefined }),
    })
    setSaving(false)
    setForm(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cliente?')) return
    await fetch('/api/clientes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={() => setForm(EMPTY)}
        className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4"
      >
        + Novo cliente
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Telefone</th>
              <th className="px-4 py-3 font-semibold">E-mail</th>
              <th className="px-4 py-3 font-semibold">Documento</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {initialCustomers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum cliente cadastrado ainda</td></tr>
            )}
            {initialCustomers.map(c => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.email ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.document ?? '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setForm(c)} className="text-blue-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-slate-900 mb-4">{form.id ? 'Editar cliente' : 'Novo cliente'}</h2>
            <div className="space-y-3">
              <input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Telefone" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="E-mail" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="CPF/CNPJ" value={form.document ?? ''} onChange={e => setForm({ ...form, document: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <textarea placeholder="Observações" value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" rows={3} />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving || !form.name}
                className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setForm(null)}
                className="text-slate-500 text-sm px-4 py-2">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
