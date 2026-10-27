'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NovoTenantForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [docType, setDocType] = useState<'cpf' | 'cnpj'>('cnpj')
  const [docNumber, setDocNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const res = await fetch('/api/admin/tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha, fullName, businessName, docType, docNumber, phone }),
    })

    const data = await res.json()
    setCarregando(false)

    if (!res.ok) {
      setErro(data.error ?? 'Erro ao cadastrar tenant.')
      return
    }

    router.push(`/admin/empresas/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
          E-mail (login)
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="senha" className="mb-1 block text-sm font-medium text-zinc-700">
          Senha inicial
        </label>
        <input
          id="senha"
          type="text"
          required
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-zinc-700">
          Nome do responsável
        </label>
        <input
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="businessName" className="mb-1 block text-sm font-medium text-zinc-700">
          Nome do negócio
        </label>
        <input
          id="businessName"
          required
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <div className="w-32">
          <label htmlFor="docType" className="mb-1 block text-sm font-medium text-zinc-700">
            Tipo
          </label>
          <select
            id="docType"
            value={docType}
            onChange={(e) => setDocType(e.target.value as 'cpf' | 'cnpj')}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="cnpj">CNPJ</option>
            <option value="cpf">CPF</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="docNumber" className="mb-1 block text-sm font-medium text-zinc-700">
            {docType === 'cnpj' ? 'CNPJ' : 'CPF'}
          </label>
          <input
            id="docNumber"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-zinc-700">
          Telefone
        </label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Opcional"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        disabled={carregando}
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {carregando ? 'Cadastrando...' : 'Cadastrar tenant'}
      </button>
    </form>
  )
}
