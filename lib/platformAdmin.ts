import { notFound, redirect } from 'next/navigation'
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

// Páginas: sem login vai pro login; logado mas não administrador recebe 404.
export async function requirePlatformAdmin(): Promise<{ user: User }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isPlatformAdmin(user.id))) notFound()
  return { user }
}

// Nível de autenticação da sessão atual: 'aal2' = passou pela verificação em
// duas etapas (TOTP) neste login.
export async function sessaoComDoisFatores(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return data?.currentLevel === 'aal2'
}

// Páginas do painel: administrador + 2FA concluído. Sem 2FA nesta sessão vai
// pra tela de verificação/ativação (que só exige ser administrador).
export async function requirePlatformAdminMfa(): Promise<{ user: User }> {
  const admin = await requirePlatformAdmin()
  if (!(await sessaoComDoisFatores())) redirect('/admin/2fa')
  return admin
}

// Rotas de API do painel: administrador + 2FA concluído, senão 404.
export async function platformAdminMfaOrNull(): Promise<{ user: User } | null> {
  const admin = await platformAdminOrNull()
  if (!admin) return null
  return (await sessaoComDoisFatores()) ? admin : null
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
