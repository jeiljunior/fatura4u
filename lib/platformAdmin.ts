import { notFound } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

// Administrador da plataforma = existe em `platform_admins` (tabela fechada,
// só lida aqui pelo servidor com service role). Nunca confiar em coluna que o
// próprio usuário consiga editar.
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

// Rotas de API e downloads: devolvem null pra quem não é administrador (a
// rota responde 404, sem revelar que existe).
export async function platformAdminOrNull(): Promise<{ user: User } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return (await isPlatformAdmin(user.id)) ? { user } : null
}

// Páginas: quem não é administrador (inclusive sem login) recebe 404.
export async function requirePlatformAdmin(): Promise<{ user: User }> {
  const admin = await platformAdminOrNull()
  if (!admin) notFound()
  return admin
}

// Registro imutável de ação do administrador. Se a gravação falhar, a ação
// em si não deve ser perdida — mas a falha aparece no log do servidor.
export async function logAdmin(
  admin: { user: User },
  action: string,
  businessId: string | null,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabaseAdmin.from('admin_audit').insert({
    admin_user_id: admin.user.id,
    admin_email: admin.user.email ?? null,
    action,
    business_id: businessId,
    meta,
  })
  if (error) console.error('[admin_audit] falha ao registrar', action, error.message)
}
