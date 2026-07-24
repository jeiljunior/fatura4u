'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  logo_url: string | null
  brand_color: string | null
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
  regua_whatsapp_ativa: boolean
  regua_email_ativa: boolean
  regua_msg_antes: string | null
  regua_msg_hoje: string | null
  regua_msg_atraso: string | null
} | null

type Certificado = { valido_ate: string | null } | null
type Gateway = { provider: string; active: boolean }

const DEFAULT_MSG_ANTES = 'Olá, {cliente}! Sua cobrança de {valor} com {negocio} vence em {dias}.\n\nPague aqui: {link}'
const DEFAULT_MSG_HOJE = 'Olá, {cliente}! Sua cobrança de {valor} com {negocio} vence hoje.\n\nPague aqui: {link}'
const DEFAULT_MSG_ATRASO = 'Olá, {cliente}, notamos que sua cobrança de {valor} com {negocio} está vencida há {dias}. Regularize quando puder.\n\nPague aqui: {link}'

export default function ConfiguracoesClient({
  business, config, certificado, gateways, whatsappConectado,
}: {
  business: Business | null
  config: Config
  certificado: Certificado
  gateways: Gateway[]
  whatsappConectado: boolean
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

  // ── Personalização (white label: logo + cor) ───────────────────
  const [logoUrl, setLogoUrl] = useState(business?.logo_url ?? '')
  const [logoPreview, setLogoPreview] = useState(business?.logo_url ?? '')
  const [brandColor, setBrandColor] = useState(business?.brand_color ?? '#2563eb')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [savingBrand, setSavingBrand] = useState(false)
  const [brandError, setBrandError] = useState('')

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !business) return
    if (file.size > 2 * 1024 * 1024) { setBrandError('Imagem muito grande. Máximo 2MB.'); return }
    setUploadingLogo(true)
    setBrandError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `logo/${business.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('business-assets').upload(path, file, { upsert: true })
    if (upErr) { setBrandError('Erro ao enviar: ' + upErr.message); setUploadingLogo(false); return }
    const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(path)
    setLogoUrl(urlData.publicUrl)
    setLogoPreview(urlData.publicUrl + '?t=' + Date.now())
    setUploadingLogo(false)
  }

  async function saveBrand() {
    setSavingBrand(true)
    await fetch('/api/negocio', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_url: logoUrl || null, brand_color: brandColor }),
    })
    setSavingBrand(false)
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
    regua_whatsapp_ativa: config?.regua_whatsapp_ativa ?? true,
    regua_email_ativa: config?.regua_email_ativa ?? true,
    regua_msg_antes: config?.regua_msg_antes ?? DEFAULT_MSG_ANTES,
    regua_msg_hoje: config?.regua_msg_hoje ?? DEFAULT_MSG_HOJE,
    regua_msg_atraso: config?.regua_msg_atraso ?? DEFAULT_MSG_ATRASO,
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

  // ── Importar clientes (planilha) ────────────────────────────────
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ total: number; inserted: number; updated: number; errors?: string[] } | null>(null)
  const [importError, setImportError] = useState('')

  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    setImportError('')
    setImportResult(null)
    const fd = new FormData()
    fd.append('file', importFile)
    const res = await fetch('/api/clientes/importar', { method: 'POST', body: fd })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setImportError(data.error ?? 'Erro ao importar planilha'); return }
    setImportResult(data)
    setImportFile(null)
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
          className="mt-4 bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
          {savingBiz ? 'Salvando...' : 'Salvar dados do negócio'}
        </button>
      </section>

      {/* Personalização (white label) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-1">Personalização</h2>
        <p className="text-slate-400 text-sm mb-4">
          Seu logo e sua cor aparecem no seu próprio painel — não muda o domínio nem a marca do FATUR4U.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview
                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                : <span className="text-slate-300 text-xs">Sem logo</span>}
            </div>
            <div>
              <input type="file" accept="image/*" onChange={handleLogoUpload}
                className="text-sm" disabled={uploadingLogo} />
              {uploadingLogo && <p className="text-slate-400 text-xs mt-1">Enviando...</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600 font-medium">Cor de destaque</label>
            <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
          </div>
        </div>
        {brandError && <p className="text-red-500 text-sm mt-2">{brandError}</p>}
        <button onClick={saveBrand} disabled={savingBrand}
          className="mt-4 bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
          {savingBrand ? 'Salvando...' : 'Salvar personalização'}
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
          className="mt-4 bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
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
            className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
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
            className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
            {savingGw ? 'Salvando...' : asaasConnected ? 'Reconectar' : 'Conectar'}
          </button>
        </div>
      </section>

      {/* Importar clientes */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-1">Importar clientes</h2>
        <p className="text-slate-400 text-sm mb-1">
          Planilha .xlsx, .xls ou .csv com dados de pessoa física ou jurídica (nome/razão social, CPF/CNPJ,
          endereço, etc. — nomes de coluna flexíveis). Clientes existentes são atualizados por documento ou
          telefone; os demais são criados.
        </p>
        <a href="/templates/clientes-modelo.xlsx" download
          className="inline-block text-sm text-[var(--brand-primary)] font-semibold hover:underline mb-4">
          📥 Baixar modelo em Excel
        </a>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files?.[0] ?? null)}
            className="text-sm" disabled={importing} />
          <button onClick={handleImport} disabled={importing || !importFile}
            className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
            {importing ? 'Importando...' : 'Importar planilha'}
          </button>
        </div>
        {importError && <p className="text-red-500 text-sm mt-2">{importError}</p>}
        {importResult && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
            {importResult.total} cliente{importResult.total > 1 ? 's' : ''} processado{importResult.total > 1 ? 's' : ''}:
            {' '}{importResult.inserted} novo{importResult.inserted !== 1 ? 's' : ''}, {importResult.updated} atualizado{importResult.updated !== 1 ? 's' : ''}.
            {importResult.errors && (
              <ul className="mt-2 text-red-600 list-disc list-inside">
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Régua de cobrança */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-1">Lembretes automáticos</h2>
        <p className="text-slate-400 text-sm mb-4">
          Avisa o cliente 3 dias antes, no dia e depois do vencimento, sem você precisar cobrar manualmente.
        </p>
        <p className="text-xs mb-4">
          WhatsApp: {whatsappConectado
            ? <span className="text-emerald-600 font-semibold">✓ conectado</span>
            : <span className="text-slate-400">não conectado — fale com o suporte pra habilitar</span>}
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={cfg.regua_whatsapp_ativa} onChange={e => setCfg({ ...cfg, regua_whatsapp_ativa: e.target.checked })} />
            Lembrete por WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={cfg.regua_email_ativa} onChange={e => setCfg({ ...cfg, regua_email_ativa: e.target.checked })} />
            Lembrete por e-mail
          </label>
        </div>

        <div className="border-t border-slate-100 mt-5 pt-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {['{cliente}', '{negocio}', '{valor}', '{dias}', '{link}'].map(v => (
              <span key={v} className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200">{v}</span>
            ))}
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                ⏳ Antes do vencimento <span className="font-normal text-slate-400">(3 dias antes)</span>
              </label>
              <textarea
                value={cfg.regua_msg_antes}
                onChange={e => setCfg({ ...cfg, regua_msg_antes: e.target.value })}
                rows={5}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                📅 No dia do vencimento
              </label>
              <textarea
                value={cfg.regua_msg_hoje}
                onChange={e => setCfg({ ...cfg, regua_msg_hoje: e.target.value })}
                rows={5}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                ⚠️ Cobrança vencida <span className="font-normal text-slate-400">(1, 3 e 7 dias depois)</span>
              </label>
              <textarea
                value={cfg.regua_msg_atraso}
                onChange={e => setCfg({ ...cfg, regua_msg_atraso: e.target.value })}
                rows={5}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-5">
          <button onClick={saveCfg} disabled={savingCfg}
            className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
            {savingCfg ? 'Salvando...' : 'Salvar preferências de lembrete'}
          </button>
          <button
            onClick={() => setCfg({ ...cfg, regua_msg_antes: DEFAULT_MSG_ANTES, regua_msg_hoje: DEFAULT_MSG_HOJE, regua_msg_atraso: DEFAULT_MSG_ATRASO })}
            className="text-sm text-slate-400 hover:text-slate-600 transition"
          >
            Restaurar mensagens padrão
          </button>
        </div>
      </section>
    </div>
  )
}
