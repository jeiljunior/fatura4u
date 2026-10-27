import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'

export const dynamic = 'force-dynamic'

type Tela = { nome: string; href: string; nota?: string }

const GRUPOS: { titulo: string; telas: Tela[] }[] = [
  {
    titulo: 'Páginas públicas',
    telas: [
      { nome: 'Página inicial', href: '/' },
      { nome: 'Entrar', href: '/login' },
      { nome: 'Criar conta', href: '/cadastro' },
      { nome: 'Esqueci minha senha', href: '/esqueci-senha' },
      { nome: 'Redefinir senha', href: '/redefinir-senha', nota: 'abre pelo link do e-mail de recuperação' },
      { nome: 'Cancelar inscrição de comunicados', href: '/descadastrar', nota: 'abre pelo link no rodapé dos comunicados' },
      { nome: 'Funcionalidade: NFS-e', href: '/funcionalidades/nfse' },
      { nome: 'Funcionalidade: cobrança por PIX, boleto e cartão', href: '/funcionalidades/cobranca-pix-boleto-cartao' },
      { nome: 'Funcionalidade: link de pagamento', href: '/funcionalidades/link-pagamento' },
    ],
  },
  {
    titulo: 'App do cliente (dashboard)',
    telas: [
      { nome: 'Início', href: '/dashboard' },
      { nome: 'Clientes', href: '/dashboard/clientes' },
      { nome: 'Cobranças', href: '/dashboard/cobrancas' },
      { nome: 'Notas fiscais (NFS-e)', href: '/dashboard/notas' },
      { nome: 'Produtos', href: '/dashboard/produtos' },
      { nome: 'Notas de produto (NF-e e NFC-e)', href: '/dashboard/notas-produto' },
      { nome: 'Contas a pagar', href: '/dashboard/contas-a-pagar' },
      { nome: 'Linha do tempo (saldo projetado)', href: '/dashboard/futuro' },
      { nome: 'Configurações', href: '/dashboard/configuracoes' },
    ],
  },
  {
    titulo: 'Painel de gestão',
    telas: [
      { nome: 'Visão geral', href: '/admin' },
      { nome: 'Empresas', href: '/admin/empresas' },
      { nome: 'Cadastrar empresa', href: '/admin/novo' },
      { nome: 'Recebimentos', href: '/admin/recebimentos' },
      { nome: 'Planos e valores', href: '/admin/planos' },
      { nome: 'E-mails', href: '/admin/emails' },
      { nome: 'Comunicados', href: '/admin/comunicados' },
      { nome: 'Registro de ações', href: '/admin/auditoria' },
      { nome: 'Verificação em duas etapas', href: '/admin/2fa' },
    ],
  },
]

export default async function TelasPage() {
  await requirePlatformAdminMfa()

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">Mapa de telas</h2>
      <p className="mb-4 text-sm text-zinc-500">Todas as telas do FATUR4U, com link, para percorrer o app e apontar ajustes.</p>

      <div className="space-y-6">
        {GRUPOS.map(g => (
          <section key={g.titulo}>
            <h3 className="mb-2 text-base font-medium text-zinc-900">{g.titulo}</h3>
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {g.telas.map(t => (
                <li key={t.href}>
                  <Link href={t.href} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800">{t.nome}</p>
                      {t.nota && <p className="text-xs text-zinc-500">{t.nota}</p>}
                    </div>
                    <span className="shrink-0 font-mono text-xs text-zinc-500">{t.href}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
