'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PropertyCard from '@/components/PropertyCard'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Listing = Database['public']['Tables']['property_listings']['Row']

const PROPERTY_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'apartment', label: 'Departamento' },
  { value: 'house', label: 'Casa' },
  { value: 'ph', label: 'PH' },
  { value: 'commercial', label: 'Comercial' },
]

const CITIES = ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata']

export default function SearchPage() {
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('Buenos Aires')
  const [propertyType, setPropertyType] = useState('')
  const [minM2, setMinM2] = useState('')
  const [maxM2, setMaxM2] = useState('')
  const [minRooms, setMinRooms] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [results, setResults] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const supabase = createClient()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSearched(true)

    let query = supabase
      .from('property_listings')
      .select('*')
      .eq('status', 'active')
      .order('price', { ascending: true })
      .limit(50)

    if (city) query = query.ilike('city', `%${city}%`)
    if (neighborhood) query = query.ilike('neighborhood', `%${neighborhood}%`)
    if (propertyType) query = query.eq('property_type' as any, propertyType)
    if (minM2) query = query.gte('m2_total', Number(minM2))
    if (maxM2) query = query.lte('m2_total', Number(maxM2))
    if (minRooms) query = query.gte('rooms', Number(minRooms))
    if (maxPrice) query = query.lte('price', Number(maxPrice)).eq('currency', currency)

    const { data } = await query
    setResults(data || [])
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Buscar propiedades</h1>
        <p className="text-gray-500 mt-1">Encontrá propiedades en venta en Argentina</p>
      </div>

      {/* Filtros */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
          <SlidersHorizontal size={18} />
          Filtros
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Barrio</label>
            <input
              type="text"
              value={neighborhood}
              onChange={e => setNeighborhood(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Palermo, Belgrano..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <select
              value={propertyType}
              onChange={e => setPropertyType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ambientes mín.</label>
            <input
              type="number"
              value={minRooms}
              onChange={e => setMinRooms(e.target.value)}
              min="1" max="10"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">M² mínimos</label>
            <input
              type="number"
              value={minM2}
              onChange={e => setMinM2(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">M² máximos</label>
            <input
              type="number"
              value={maxM2}
              onChange={e => setMaxM2(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio máximo</label>
            <div className="flex gap-1">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
              <input
                type="number"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="150000"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          <Search size={16} />
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Resultados */}
      {searched && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {loading ? 'Buscando...' : `${results.length} propiedad${results.length !== 1 ? 'es' : ''} encontrada${results.length !== 1 ? 's' : ''}`}
          </p>

          {results.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-400">
              <Building2Size size={40} className="mx-auto mb-3 opacity-30" />
              <p>No encontramos propiedades con esos filtros.</p>
              <p className="text-sm mt-1">Probá ampliando los criterios de búsqueda.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map(listing => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Building2Size({ size, className }: { size: number; className: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
}
