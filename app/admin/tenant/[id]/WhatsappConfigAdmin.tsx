'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type WhatsappConfig = {
  instance: string | null
  token: string | null
  phone: string | null
  active: boolean
} | null

export default function WhatsappConfigAdmin({ businessId, initial }: { businessId: string; initial: WhatsappConfig }) {
  const router = useRouter()
  const [form, setForm] = useState({
    instance: initial?.instance ?? '',
    token: initial?.token ?? '',
    phone: initial?.phone ?? '',
    active: initial?.active ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setSaved(false)
    setError('')
    const res = await fetch(`/api/admin/tenant/${businessId}/whatsapp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Erro ao salvar')
      return
    }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Instância conectada</p>
        <button
          onClick={() => setForm(f => ({ ...f, active: !f.active }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      <input placeholder="ID da instância (Z-API)" value={form.instance} onChange={e => setForm(f => ({ ...f, instance: e.target.value }))}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono" />
      <input placeholder="Token da instância (Z-API)" value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono" />
      <input placeholder="Telefone conectado (com DDI, ex: 5541999998888)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono" />
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {saved && <span className="text-emerald-600 text-sm font-medium">✓ Salvo</span>}
        {error && <span className="text-red-500 text-sm">{error}</span>}
      </div>
    </div>
  )
}
