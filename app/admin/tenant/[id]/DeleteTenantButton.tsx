'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteTenantButton({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const canDelete = confirmText.trim() === businessName

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    setError('')
    const res = await fetch(`/api/admin/tenant/${businessId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao excluir')
      setDeleting(false)
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-red-600 hover:text-red-700 text-sm font-semibold px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 transition"
      >
        🗑️ Excluir tenant
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !deleting && setOpen(false)}>
          <div className="bg-white rounded-2xl border border-red-200 shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-red-700 text-lg mb-2">⚠️ Excluir tenant permanentemente</h2>
            <p className="text-sm text-slate-600 mb-4">
              Isso apaga <strong>{businessName}</strong> e TODOS os dados relacionados — clientes, cobranças,
              notas fiscais, certificado digital e credenciais de gateway. Os usuários vinculados a essa conta
              também perdem o login. <strong>Essa ação não pode ser desfeita.</strong>
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Digite <span className="font-mono font-bold">{businessName}</span> pra confirmar
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder={businessName}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
