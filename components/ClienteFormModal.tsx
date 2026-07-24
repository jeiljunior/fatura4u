'use client'
import { useState } from 'react'
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskBirthDate } from '@/lib/masks'

export type Cliente = {
  id: string
  tipo_pessoa: 'pf' | 'pj'
  name: string
  document: string | null
  birth_date: string | null
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  phone: string | null
  email: string | null
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  notes: string | null
}

const EMPTY: Cliente = {
  id: '', tipo_pessoa: 'pf', name: '', document: '', birth_date: '',
  inscricao_estadual: '', inscricao_municipal: '', phone: '', email: '',
  address_zip: '', address_street: '', address_number: '', address_complement: '',
  address_neighborhood: '', address_city: '', address_state: '', notes: '',
}

// ISO (YYYY-MM-DD, vindo do banco) <-> DD/MM/AAAA (exibido no input mascarado)
function isoToBr(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}
function brToIso(br: string): string | null {
  const p = br.split('/')
  if (p.length !== 3 || p[2].length !== 4) return null
  return `${p[2]}-${p[1]}-${p[0]}`
}

const inp = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm'
const lbl = 'block text-xs font-semibold text-slate-500 mb-1'

export default function ClienteFormModal({
  initial, onClose, onSaved,
}: {
  initial?: Cliente | null
  onClose: () => void
  onSaved: (c: { id: string; name: string; document: string | null }) => void
}) {
  const [form, setForm] = useState<Cliente>(
    initial ? { ...initial, birth_date: isoToBr(initial.birth_date) } : EMPTY
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadingCep, setLoadingCep] = useState(false)
  const [loadingCnpj, setLoadingCnpj] = useState(false)

  function set<K extends keyof Cliente>(key: K, value: Cliente[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function fetchCep(cep: string) {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const d = await res.json()
      if (!d.erro) {
        setForm(f => ({
          ...f,
          address_street: d.logradouro ?? f.address_street,
          address_neighborhood: d.bairro ?? f.address_neighborhood,
          address_city: d.localidade ?? f.address_city,
          address_state: d.uf ?? f.address_state,
        }))
      }
    } catch {}
    setLoadingCep(false)
  }

  async function fetchCnpj() {
    const clean = (form.document ?? '').replace(/\D/g, '')
    if (clean.length !== 14) { setError('CNPJ inválido'); return }
    setLoadingCnpj(true); setError('')
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`)
      if (!res.ok) throw new Error()
      const d = await res.json()
      setForm(f => ({
        ...f,
        name: d.razao_social ?? f.name,
        address_street: d.logradouro ?? f.address_street,
        address_number: d.numero ?? f.address_number,
        address_complement: d.complemento ?? f.address_complement,
        address_neighborhood: d.bairro ?? f.address_neighborhood,
        address_city: d.municipio ?? f.address_city,
        address_state: d.uf ?? f.address_state,
        address_zip: d.cep ? maskCEP(String(d.cep)) : f.address_zip,
      }))
    } catch { setError('CNPJ não encontrado na Receita Federal') }
    setLoadingCnpj(false)
  }

  async function handleSave() {
    if (!form.name) { setError('Preencha o nome / razão social'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      id: form.id || undefined,
      birth_date: form.tipo_pessoa === 'pf' ? brToIso(form.birth_date ?? '') : null,
    }
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao salvar cliente'); return }
    onSaved({ id: data.id, name: form.name, document: form.document })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-slate-900 mb-4">{form.id ? 'Editar cliente' : 'Novo cliente'}</h2>

        <div className="flex gap-2 mb-4">
          {(['pf', 'pj'] as const).map(t => (
            <button key={t} type="button" onClick={() => set('tipo_pessoa', t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                form.tipo_pessoa === t
                  ? 'border-[var(--brand-primary)] bg-blue-50 text-[var(--brand-primary)]'
                  : 'border-slate-200 text-slate-500'
              }`}>
              {t === 'pf' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {form.tipo_pessoa === 'pj' && (
            <div>
              <label className={lbl}>CNPJ</label>
              <div className="flex gap-2">
                <input className={`${inp} flex-1`} placeholder="00.000.000/0001-00" maxLength={18}
                  value={form.document ?? ''} onChange={e => set('document', maskCNPJ(e.target.value))} />
                <button type="button" onClick={fetchCnpj} disabled={loadingCnpj}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 rounded-xl disabled:opacity-50">
                  {loadingCnpj ? '...' : '🔍 Buscar'}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className={lbl}>{form.tipo_pessoa === 'pf' ? 'Nome completo' : 'Razão social'}</label>
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {form.tipo_pessoa === 'pf' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>CPF</label>
                <input className={inp} placeholder="000.000.000-00" maxLength={14}
                  value={form.document ?? ''} onChange={e => set('document', maskCPF(e.target.value))} />
              </div>
              <div>
                <label className={lbl}>Data de nascimento</label>
                <input className={inp} placeholder="DD/MM/AAAA" maxLength={10}
                  value={form.birth_date ?? ''} onChange={e => set('birth_date', maskBirthDate(e.target.value))} />
              </div>
            </div>
          )}

          {form.tipo_pessoa === 'pj' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Inscrição Estadual</label>
                <input className={inp} placeholder="Isento, se não houver" value={form.inscricao_estadual ?? ''} onChange={e => set('inscricao_estadual', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Inscrição Municipal</label>
                <input className={inp} value={form.inscricao_municipal ?? ''} onChange={e => set('inscricao_municipal', e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>E-mail</label>
              <input className={inp} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Celular</label>
              <input className={inp} placeholder="41 99999-9999" value={form.phone ?? ''} onChange={e => set('phone', maskPhone(e.target.value))} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2 mb-1">
              <label className={lbl + ' mb-0'}>CEP</label>
              {loadingCep && <span className="text-xs text-slate-400">buscando...</span>}
            </div>
            <input className={inp} placeholder="00000-000" maxLength={9}
              value={form.address_zip ?? ''}
              onChange={e => {
                const masked = maskCEP(e.target.value)
                set('address_zip', masked)
                if (masked.replace(/\D/g, '').length === 8) fetchCep(masked)
              }} />
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="col-span-2">
                <label className={lbl}>Rua / Logradouro</label>
                <input className={inp} value={form.address_street ?? ''} onChange={e => set('address_street', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Número</label>
                <input className={inp} value={form.address_number ?? ''} onChange={e => set('address_number', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className={lbl}>Complemento</label>
                <input className={inp} placeholder="Opcional" value={form.address_complement ?? ''} onChange={e => set('address_complement', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Bairro</label>
                <input className={inp} value={form.address_neighborhood ?? ''} onChange={e => set('address_neighborhood', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Cidade / UF</label>
                <div className="flex gap-2">
                  <input className={inp} value={form.address_city ?? ''} onChange={e => set('address_city', e.target.value)} />
                  <input className={`${inp} w-16`} maxLength={2} value={form.address_state ?? ''} onChange={e => set('address_state', e.target.value.toUpperCase())} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Observações</label>
            <textarea className={inp} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={handleSave} disabled={saving || !form.name}
            className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={onClose} className="text-slate-500 text-sm px-4 py-2">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
