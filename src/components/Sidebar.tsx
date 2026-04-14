'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Home, Search, TrendingUp, Building2, MessageSquare,
  Users, BarChart3, LogOut, User
} from 'lucide-react'
import type { UserRole } from '@/lib/supabase/types'

interface Profile {
  name: string | null
  role: UserRole
}

const navByRole: Record<UserRole, { href: string; label: string; icon: React.ReactNode }[]> = {
  buyer: [
    { href: '/dashboard', label: 'Inicio', icon: <Home size={18} /> },
    { href: '/dashboard/search', label: 'Buscar propiedades', icon: <Search size={18} /> },
    { href: '/dashboard/opportunities', label: 'Oportunidades', icon: <TrendingUp size={18} /> },
    { href: '/dashboard/messages', label: 'Mensajes', icon: <MessageSquare size={18} /> },
  ],
  seller: [
    { href: '/dashboard', label: 'Inicio', icon: <Home size={18} /> },
    { href: '/dashboard/my-property', label: 'Mi propiedad', icon: <Building2 size={18} /> },
    { href: '/dashboard/analysis', label: 'Análisis de precio', icon: <BarChart3 size={18} /> },
    { href: '/dashboard/messages', label: 'Mensajes', icon: <MessageSquare size={18} /> },
  ],
  both: [
    { href: '/dashboard', label: 'Inicio', icon: <Home size={18} /> },
    { href: '/dashboard/search', label: 'Buscar propiedades', icon: <Search size={18} /> },
    { href: '/dashboard/opportunities', label: 'Oportunidades', icon: <TrendingUp size={18} /> },
    { href: '/dashboard/my-property', label: 'Mi propiedad', icon: <Building2 size={18} /> },
    { href: '/dashboard/analysis', label: 'Análisis de precio', icon: <BarChart3 size={18} /> },
    { href: '/dashboard/messages', label: 'Mensajes', icon: <MessageSquare size={18} /> },
  ],
  agent: [
    { href: '/dashboard', label: 'Inicio', icon: <Home size={18} /> },
    { href: '/dashboard/agent/clients', label: 'Mis clientes', icon: <Users size={18} /> },
    { href: '/dashboard/agent/listings', label: 'Propiedades', icon: <Building2 size={18} /> },
    { href: '/dashboard/messages', label: 'Mensajes', icon: <MessageSquare size={18} /> },
  ],
}

const roleLabel: Record<UserRole, string> = {
  buyer: 'Comprador',
  seller: 'Vendedor',
  both: 'Comprador / Vendedor',
  agent: 'Agente Inmobiliario',
}

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const links = navByRole[profile.role] || navByRole.buyer

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-10">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Home className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-900">Agente Imob.</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              pathname === link.href
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <Link href="/dashboard/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 mb-1">
          <User size={18} />
          <div>
            <div className="font-medium text-gray-900 leading-tight">{profile.name}</div>
            <div className="text-xs text-gray-400">{roleLabel[profile.role]}</div>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 w-full transition"
        >
          <LogOut size={18} />
          Salir
        </button>
      </div>
    </aside>
  )
}
