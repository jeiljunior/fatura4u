import supabaseAdmin from '@/lib/supabase/admin'

export async function lerConfig<T>(key: string): Promise<T | null> {
  const { data } = await supabaseAdmin.from('app_settings').select('value').eq('key', key).maybeSingle()
  return (data?.value as T) ?? null
}

export async function salvarConfig(key: string, value: unknown, adminUserId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('app_settings').upsert({
    key, value, updated_by: adminUserId, updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}
