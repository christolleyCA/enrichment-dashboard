import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import LiveRefresh from '@/components/live-refresh'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Enrichment Monitor',
  description: 'NFP enrichment pipeline dashboard',
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors text-sm"
    >
      {label}
    </Link>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex font-[family-name:var(--font-inter)]">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col justify-between p-4 sticky top-0 h-screen">
          <div>
            <div className="flex items-center gap-2 mb-8 px-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <h1 className="text-lg font-bold text-gray-100">Enrichment Monitor</h1>
            </div>
            <nav className="flex flex-col gap-1">
              <NavLink href="/" label="Overview" />
              <NavLink href="/urls" label="URL Discovery" />
              <NavLink href="/news" label="News Discovery" />
              <NavLink href="/samples" label="Samples" />
              <NavLink href="/costs" label="Costs & Balances" />
              <NavLink href="/system" label="GPU & System" />
            </nav>
          </div>
          <div className="px-2 text-xs text-gray-600">
            <p>grantomatic-prod</p>
            <p className="font-mono">hjtvtkffpziopozmtsnb</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen overflow-auto p-8">
          {children}
        </main>

        <LiveRefresh />
      </body>
    </html>
  )
}
