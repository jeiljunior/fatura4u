'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Business = {
  id: string
  name: string
  document_type: string | null
  document_number: string | null
  razao_social: string | null
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
}

type Config = {
  inscricao_municipal: string | null
  regime_tributario: string | null
  codigo_servico_padrao: string | null
  aliquota_iss_padrao: number | null
  ambiente: string
  municipio_ibge: string | null
  serie_dps: string
  codigo_nbs: string | null
  emissao_automatica: boolean
} | null

type Certificado = { valido_ate: string | null } | null
type Gateway = { provider: string; active: boolean }

export default function ConfiguracoesClient({
  business, config, certificado, gateways,
}: {
  business: Business | null
  config: Config
  certificado: Certificado
  gateways: Gateway[]
}) {
  const router = useRouter()

  // ── Dados do negócio ──────────────────────────────────────────
  const [biz, setBiz] = useState({
    document_type: business?.document_type ?? 'cnpj',
    document_number: business?.document_number ?? '',
    razao_social: business?.razao_social ?? '',
    address_zip: business?.address_zip ?? '',
    address_street: business?.address_street ?? '',
    address_number: business?.address_number ?? '',
    address_complement: business?.address_complement ?? '',
    address_neighborhood: business?.address_neighborhood ?? '',
    address_city: business?.address_city ?? '',
    address_state: business?.address_state ?? '',
  })
  const [savingBiz, setSavingBiz] = useState(false)

  async function saveBiz() {
    setSavingBiz(true)
    await fetch('/api/negocio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(biz) })
    setSavingBiz(false)
    router.refresh()
  }

  // ── Config fiscal ─────────────────────────────────────────────
  const [cfg, setCfg] = useState({
    inscricao_municipal: config?.inscricao_municipal ?? '',
    regime_tributario: config?.regime_tributario ?? 'mei',
    codigo_servico_padrao: config?.codigo_servico_padrao ?? '',
    aliquota_iss_padrao: config?.aliquota_iss_padrao ?? '',
    ambiente: config?.ambiente ?? 'homologacao',
    municipio_ibge: config?.municipio_ibge ?? '',
    serie_dps: config?.serie_dps ?? '1',
    codigo_nbs: config?.codigo_nbs ?? '',
    emissao_automatica: config?.emissao_automatica ?? false,
  })
  const [savingCfg, setSavingCfg] = useState(false)

  async function saveCfg() {
    setSavingCfg(true)
    await fetch('/api/faturamento/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) })
    setSavingCfg(false)
    router.refresh()
  }

  // ── Certificado digital ──────────────────────────────────────
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certSenha, setCertSenha] = useState('')
  const [uploadingCert, setUploadingCert] = useState(false)
  const [certError, setCertError] = useState('')

  async function uploadCert() {
    if (!certFile || !certSenha) return
    setUploadingCert(true)
    setCertError('')
    const fd = new FormData()
    fd.append('arquivo', certFile)
    fd.append('senha', certSenha)
    const res = await fetch('/api/faturamento/certificado', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingCert(false)
    if (!res.ok) { setCertError(data.error ?? 'Erro ao enviar certificado'); return }
    setCertFile(null)
    setCertSenha('')
    router.refresh()
  }

  // ── Gateway (Asaas) ───────────────────────────────────────────
  const asaasConnected = gateways.find(g => g.provider === 'asaas')?.active ?? false
  const [asaasKey, setAsaasKey] = useState('')
  const [savingGw, setSavingGw] = useState(false)

  async function connectAsaas() {
    if (!asaasKey) return
    setSavingGw(true)
    await fetch('/api/faturamento/gateway-credentials', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'asaas', apiKey: asaasKey }),
    })
    setSavingGw(false)
    setAsaasKey('')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Dados do negócio */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-4">Dados do negócio</h2>
        <div className="grid grid-cols-2 gap-3">
          <select value={biz.document_type} onChange={e => setBiz({ ...biz, document_type: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm col-span-2 sm:col-span-1">
            <option value="cnpj">CNPJ</option>
            <option value="cpf">CPF</option>
          </select>
          <input placeholder="Número do documento" value={biz.document_number} onChange={e => setBiz({ ...biz, document_number: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm col-span-2 sm:col-span-1" />
          <input placeholder="Razão social" value={biz.razao_social} onChange={e => setBiz({ ...biz, razao_social: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm col-span-2" />
          <input placeholder="CEP" value={biz.address_zip} onChange={e => setBiz({ ...biz, address_zip: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Cidade" value={biz.address_city} onChange={e => setBiz({ ...biz, address_city: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Rua" value={biz.address_street} onChange={e => setBiz({ ...biz, address_street: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Número" value={biz.address_number} onChange={e => setBiz({ ...biz, address_number: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Bairro" value={biz.address_neighborhood} onChange={e => setBiz({ ...biz, address_neighborhood: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="UF" value={biz.address_state} onChange={e => setBiz({ ...biz, address_state: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <button onClick={saveBiz} disabled={savingBiz}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
          {savingBiz ? 'Salvando...' : 'Salvar dados do negócio'}
        </button>
      </section>

      {/* Config fiscal */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-4">Configuração fiscal (NFS-e)</h2>
        <div className="grid grid-cols-2 gap-3">
          <select value={cfg.regime_tributario} onChange={e => setCfg({ ...cfg, regime_tributario: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            <option value="mei">MEI</option>
            <option value="simples">Simples Nacional</option>
            <option value="normal">Regime normal</option>
          </select>
          <select value={cfg.ambiente} onChange={e => setCfg({ ...cfg, ambiente: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            <option value="homologacao">Homologação (teste)</option>
            <option value="producao">Produção</option>
          </select>
          <input placeholder="Inscrição municipal" value={cfg.inscricao_municipal} onChange={e => setCfg({ ...cfg, inscricao_municipal: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Código IBGE do município" value={cfg.municipio_ibge} onChange={e => setCfg({ ...cfg, municipio_ibge: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Código de serviço (LC 116)" value={cfg.codigo_servico_padrao} onChange={e => setCfg({ ...cfg, codigo_servico_padrao: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Código NBS" value={cfg.codigo_nbs} onChange={e => setCfg({ ...cfg, codigo_nbs: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Alíquota ISS (%)" type="number" step="0.01" value={cfg.aliquota_iss_padrao} onChange={e => setCfg({ ...cfg, aliquota_iss_padrao: e.target.value as unknown as number })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Série da DPS" value={cfg.serie_dps} onChange={e => setCfg({ ...cfg, serie_dps: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 mt-3 text-sm text-slate-700">
          <input type="checkbox" checked={cfg.emissao_automatica} onChange={e => setCfg({ ...cfg, emissao_automatica: e.target.checked })} />
          Emitir nota automaticamente quando uma cobrança for confirmada
        </label>
        <button onClick={saveCfg} disabled={savingCfg}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
          {savingCfg ? 'Salvando...' : 'Salvar configuração fiscal'}
        </button>
      </section>

      {/* Certificado digital */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-1">Certificado digital A1</h2>
        <p className="text-slate-400 text-sm mb-4">
          {certificado?.valido_ate ? `Cadastrado — válido até ${certificado.valido_ate}` : 'Nenhum certificado cadastrado ainda'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="file" accept=".pfx,.p12" onChange={e => setCertFile(e.target.files?.[0] ?? null)}
            className="text-sm" />
          <input type="password" placeholder="Senha do certificado" value={certSenha} onChange={e => setCertSenha(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <button onClick={uploadCert} disabled={uploadingCert || !certFile || !certSenha}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
            {uploadingCert ? 'Enviando...' : 'Enviar certificado'}
          </button>
        </div>
        {certError && <p className="text-red-500 text-sm mt-2">{certError}</p>}
      </section>

      {/* Gateway de pagamento */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-1">Gateway de pagamento (Asaas)</h2>
        <p className="text-slate-400 text-sm mb-4">
          {asaasConnected ? '✓ Conectado' : 'Não conectado — cole a chave de API da sua conta Asaas'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="password" placeholder="Chave de API do Asaas" value={asaasKey} onChange={e => setAsaasKey(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1" />
          <button onClick={connectAsaas} disabled={savingGw || !asaasKey}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
            {savingGw ? 'Salvando...' : asaasConnected ? 'Reconectar' : 'Conectar'}
          </button>
        </div>
      </section>
    </div>
  )
}
