'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, ExternalLink, AlertCircle } from 'lucide-react'
import PropertyCard from '@/components/PropertyCard'

type Listing = {
  id: string
  title: string | null
  price: number | null
  currency: string | null
  m2_total: number | null
  m2_covered: number | null
  rooms: number | null
  bathrooms: number | null
  neighborhood: string | null
  address: string | null
  images: string[] | null
  url: string | null
  status: string | null
}

type Opportunity = {
  id: string
  listing_id: string
  match_score: number | null
  opportunity_score: number | null
  notified_at: string | null
  listing?: Listing
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPreferences, setHasPreferences] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadOpportunities()
  }, [])

  async function loadOpportunities() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check preferences
    const { data: prefs } = await (supabase as any)
      .from('search_preferences')
      .select('id')
      .eq('user_id', user.id)
      .eq('active', true)
      .limit(1)

    if (!prefs || prefs.length === 0) {
      setHasPreferences(false)
      setLoading(false)
      return
    }

    const prefIds = prefs.map((p: any) => p.id)

    const { data: opps } = await (supabase as any)
      .from('property_opportunities')
      .select('*, listing:property_listings(*)')
      .in('preference_id', prefIds)
      .order('opportunity_score', { ascending: false })
      .limit(30)

    setOpportunities(opps || [])
    setLoading(false)
  }

  function formatScore(score: number | null) {
    if (!score) return '—'
    const pct = Math.round(score * 100)
    if (pct > 0) return `${pct}% abajo del mercado`
    if (pct < 0) return `${Math.abs(pct)}% sobre el mercado`
    return 'Precio de mercado'
  }

  function scoreColor(score: number | null) {
    if (!score) return 'text-gray-500'
    if (score > 0.1) return 'text-emerald-600'
    if (score > 0) return 'text-blue-600'
    return 'text-amber-600'
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Oportunidades</h1>
        <p className="text-gray-500 mt-1">Propiedades que encajan con tus criterios y están por debajo del mercado</p>
      </div>

      {!hasPreferences && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Configurá tus preferencias primero</p>
            <p className="text-sm text-amber-700 mt-1">
              Para ver oportunidades, primero configurá tus criterios de búsqueda en la sección{' '}
              <a href="/dashboard/search" className="underline font-medium">Buscar propiedades</a>.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="animate-pulse">Buscando oportunidades...</p>
        </div>
      )}

      {!loading && hasPreferences && opportunities.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No encontramos oportunidades por ahora</p>
          <p className="text-sm mt-1">Las oportunidades se actualizan automáticamente cuando el scraper corre</p>
        </div>
      )}

      {opportunities.length > 0 && (
        <div className="space-y-4">
          {opportunities.map(opp => (
            <div key={opp.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className={`text-sm font-semibold ${scoreColor(opp.opportunity_score)}`}>
                    <TrendingUp size={14} className="inline mr-1" />
                    {formatScore(opp.opportunity_score)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Encaje: {opp.match_score ? `${Math.round(opp.match_score * 100)}%` : '—'}
                  </div>
                </div>
                {opp.listing?.url && (
                  <a
                    href={opp.listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    <ExternalLink size={13} />
                    Ver en portal
                  </a>
                )}
              </div>
              {opp.listing && <PropertyCard listing={opp.listing as any} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
