'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, TrendingUp, Search, MessageSquare, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

const roleLabel: Record<string, string> = {
  buyer: 'Comprador', seller: 'Vendedor', both: 'Comprador/Vendedor', agent: 'Agente'
}

export default function AgentClientsPage() {
  const [clients, setClients] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [newClientEmail, setNewClientEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const supabase = createClient()

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: rels } = await supabase
      .from('agent_clients')
      .select('client_id')
      .eq('agent_id', user.id)
      .eq('status', 'active') as { data: { client_id: string }[] | null }

    if (rels && rels.length > 0) {
      const ids = rels.map((r: { client_id: string }) => r.client_id)
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
      setClients(profiles || [])
    }
    setLoading(false)
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError('')

    // Busca o usuário pelo e-mail via auth admin (não disponível no client-side)
    // Aqui usaríamos uma API route. Por ora mostramos instrução.
    setAddError('Para agregar un cliente, pedile que se registre y compartí tu código de agente con él. Esta función estará disponible en breve.')
    setAdding(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis clientes</h1>
        <p className="text-gray-500 mt-1">Gestioná tus compradores y vendedores</p>
      </div>

      {/* Agregar cliente */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Plus size={16} />
          Agregar cliente
        </h2>
        <form onSubmit={addClient} className="flex gap-3">
          <input
            type="email"
            value={newClientEmail}
            onChange={e => setNewClientEmail(e.target.value)}
            placeholder="email@cliente.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={adding || !newClientEmail}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {adding ? 'Agregando...' : 'Agregar'}
          </button>
        </form>
        {addError && <p className="text-amber-600 text-xs mt-2">{addError}</p>}
      </div>

      {/* Lista de clientes */}
      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>Todavía no tenés clientes asignados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map(client => (
            <div key={client.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{client.name || 'Sin nombre'}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    client.role === 'buyer' ? 'bg-blue-100 text-blue-700' :
                    client.role === 'seller' ? 'bg-amber-100 text-amber-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {roleLabel[client.role]}
                  </span>
                </div>
              </div>
              {client.phone && (
                <p className="text-sm text-gray-500 mb-3">📞 {client.phone}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {(client.role === 'buyer' || client.role === 'both') && (
                  <Link
                    href={`/dashboard/opportunities?client=${client.id}`}
                    className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition"
                  >
                    <TrendingUp size={13} />
                    Oportunidades
                  </Link>
                )}
                {(client.role === 'seller' || client.role === 'both') && (
                  <Link
                    href={`/dashboard/analysis?client=${client.id}`}
                    className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                  >
                    <Search size={13} />
                    Análisis
                  </Link>
                )}
                <Link
                  href={`/dashboard/messages?contact=${client.id}`}
                  className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                >
                  <MessageSquare size={13} />
                  Mensaje
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
