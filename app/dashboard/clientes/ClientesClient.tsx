'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ClienteFormModal, { Cliente } from '@/components/ClienteFormModal'

export default function ClientesClient({ initialCustomers }: { initialCustomers: Cliente[] }) {
  const router = useRouter()
  const [form, setForm] = useState<Cliente | null>(null)
  const [showForm, setShowForm] = useState(false)

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
        onClick={() => { setForm(null); setShowForm(true) }}
        className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4"
      >
        + Novo cliente
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Nome / Razão social</th>
              <th className="px-4 py-3 font-semibold">Documento</th>
              <th className="px-4 py-3 font-semibold">Telefone</th>
              <th className="px-4 py-3 font-semibold">E-mail</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {initialCustomers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum cliente cadastrado ainda</td></tr>
            )}
            {initialCustomers.map(c => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase">{c.tipo_pessoa === 'pj' ? 'PJ' : 'PF'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.document ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm(c); setShowForm(true) }} className="text-blue-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ClienteFormModal
          initial={form}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); router.refresh() }}
        />
      )}
    </div>
  )
}
