import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Search, Building2, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user!.id)
    .single()

  const role = profile?.role || 'buyer'

  // Estatísticas básicas
  const [{ count: listingsCount }, { count: messagesCount }] = await Promise.all([
    supabase.from('property_listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user!.id).is('read_at', null),
  ])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {profile?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Acá tenés un resumen de lo que está pasando hoy.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Building2 className="text-indigo-600" size={22} />}
          label="Propiedades en el mercado"
          value={listingsCount?.toLocaleString('es-AR') ?? '—'}
          bg="bg-indigo-50"
        />
        <StatCard
          icon={<MessageSquare className="text-emerald-600" size={22} />}
          label="Mensajes sin leer"
          value={messagesCount?.toString() ?? '0'}
          bg="bg-emerald-50"
          href="/dashboard/messages"
        />
        <StatCard
          icon={<TrendingUp className="text-amber-600" size={22} />}
          label="Oportunidades detectadas"
          value="—"
          bg="bg-amber-50"
          href={role !== 'seller' ? '/dashboard/opportunities' : undefined}
        />
      </div>

      {/* Acciones rápidas */}
      <h2 className="text-base font-semibold text-gray-700 mb-3">Acciones rápidas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(role === 'buyer' || role === 'both') && (
          <>
            <QuickAction href="/dashboard/search" icon={<Search size={20} />} label="Buscar propiedades" desc="Filtrá por barrio, m², precio y más" color="indigo" />
            <QuickAction href="/dashboard/opportunities" icon={<TrendingUp size={20} />} label="Ver oportunidades" desc="Propiedades por debajo del precio de mercado" color="emerald" />
          </>
        )}
        {(role === 'seller' || role === 'both') && (
          <>
            <QuickAction href="/dashboard/my-property" icon={<Building2 size={20} />} label="Mi propiedad" desc="Registrá o editá la propiedad que querés vender" color="amber" />
            <QuickAction href="/dashboard/analysis" icon={<TrendingUp size={20} />} label="Análisis de precio" desc="Obtené el rango estimado de precio para tu propiedad" color="rose" />
          </>
        )}
        {role === 'agent' && (
          <QuickAction href="/dashboard/agent/clients" icon={<Search size={20} />} label="Ver clientes" desc="Gestioná tus compradores y vendedores" color="indigo" />
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg, href }: {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
  href?: string
}) {
  const content = (
    <div className={`${bg} rounded-xl p-4 flex items-center gap-4 ${href ? 'hover:opacity-90 transition' : ''}`}>
      <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>
}

function QuickAction({ href, icon, label, desc, color }: {
  href: string
  icon: React.ReactNode
  label: string
  desc: string
  color: 'indigo' | 'emerald' | 'amber' | 'rose'
}) {
  const colors = {
    indigo: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100',
    emerald: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100',
    amber: 'text-amber-600 bg-amber-50 hover:bg-amber-100',
    rose: 'text-rose-600 bg-rose-50 hover:bg-rose-100',
  }
  return (
    <Link href={href} className={`${colors[color]} rounded-xl p-4 flex items-start gap-3 transition`}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="font-semibold text-gray-900">{label}</div>
        <div className="text-sm text-gray-500 mt-0.5">{desc}</div>
      </div>
    </Link>
  )
}
