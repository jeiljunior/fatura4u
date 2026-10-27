import type { Metadata } from 'next'
import { Geist } from 'next/font/google'

export const metadata: Metadata = { robots: { index: false, follow: false } }

// Mesma fonte do painel de gestão do SIGN4U.
const geist = Geist({ subsets: ['latin'] })

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={geist.className}>{children}</div>
}
