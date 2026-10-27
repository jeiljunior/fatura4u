// Leitura/gravação da configuração de planos (só servidor), em app_settings
// (chave 'planos'). IMPORTANTE: por enquanto nada na landing nem na cobrança lê
// estes valores — o FATUR4U ainda não vende planos.
import { lerConfig, salvarConfig } from '@/lib/appSettings'
import { PADRAO, type ConfigPlanos, type PlanoId } from '@/lib/planosBase'

export * from '@/lib/planosBase'

export async function lerPlanos(): Promise<ConfigPlanos> {
  const salvo = await lerConfig<Partial<ConfigPlanos>>('planos')
  if (!salvo) return structuredClone(PADRAO)
  const planos = { ...structuredClone(PADRAO.planos) }
  for (const id of Object.keys(planos) as PlanoId[]) planos[id] = { ...planos[id], ...(salvo.planos?.[id] ?? {}) }
  return {
    landing_precos: salvo.landing_precos ?? PADRAO.landing_precos,
    contratacao_aberta: salvo.contratacao_aberta ?? PADRAO.contratacao_aberta,
    desconto_anual_pct: salvo.desconto_anual_pct ?? PADRAO.desconto_anual_pct,
    planos,
  }
}

export async function salvarPlanos(config: ConfigPlanos, adminUserId: string): Promise<void> {
  await salvarConfig('planos', config, adminUserId)
}
