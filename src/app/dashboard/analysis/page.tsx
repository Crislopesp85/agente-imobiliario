'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { analyzePrice } from '@/lib/analysis'
import PropertyCard from '@/components/PropertyCard'
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Database } from '@/lib/supabase/types'

type SellerProperty = Database['public']['Tables']['seller_properties']['Row']
type Listing = Database['public']['Tables']['property_listings']['Row']

function AnalysisContent() {
  const searchParams = useSearchParams()
  const propertyId = searchParams.get('property')
  const [properties, setProperties] = useState<SellerProperty[]>([])
  const [selected, setSelected] = useState<SellerProperty | null>(null)
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzePrice> | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadProperties()
  }, [])

  async function loadProperties() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('seller_properties').select('*').eq('seller_id', user.id).eq('status', 'active')
    setProperties(data || [])
    if (propertyId && data) {
      const prop = data.find(p => p.id === propertyId)
      if (prop) { setSelected(prop); runAnalysis(prop) }
    }
  }

  async function runAnalysis(property: SellerProperty) {
    setLoading(true)
    setAnalysis(null)

    // Buscar comparáveis: mesmo bairro, m² ±30%, mesma qt ambientes ±1
    const m2Min = property.m2_total * 0.7
    const m2Max = property.m2_total * 1.3

    let query = supabase
      .from('property_listings')
      .select('*')
      .eq('status', 'active')
      .ilike('neighborhood', `%${property.neighborhood}%`)
      .gte('m2_total', m2Min)
      .lte('m2_total', m2Max)
      .not('price', 'is', null)
      .limit(30)

    if (property.rooms) {
      query = query.gte('rooms', property.rooms - 1).lte('rooms', property.rooms + 1)
    }

    const { data: comparables } = await query

    const result = analyzePrice(comparables || [], property.m2_total, property.urgency)
    setAnalysis(result)

    // Salvar análise no banco
    if (comparables && comparables.length > 0) {
      await supabase.from('price_analyses').insert({
        property_id: property.id,
        comparables: comparables.map(c => ({ id: c.id, price: c.price, m2_total: c.m2_total })),
        price_per_m2_avg: result.pricePerM2.avg,
        price_per_m2_min: result.pricePerM2.min,
        price_per_m2_max: result.pricePerM2.max,
        estimated_price_min: result.estimatedPrice.min,
        estimated_price_max: result.estimatedPrice.max,
        confidence_score: result.confidenceScore,
        observations: result.observations,
      })
    }

    setLoading(false)
  }

  function formatUSD(v: number) {
    return `USD ${v.toLocaleString('es-AR')}`
  }

  const chartData = analysis?.comparables.slice(0, 10).map((c, i) => ({
    name: `#${i + 1}`,
    precio: c.price ? Math.round(c.price / (c.m2_total || 1)) : 0,
  })) || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Análisis de precio</h1>
        <p className="text-gray-500 mt-1">Compará tu propiedad con el mercado actual</p>
      </div>

      {/* Selector de propiedad */}
      {properties.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleccioná tu propiedad</label>
          <div className="flex gap-3 flex-wrap">
            {properties.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelected(p); runAnalysis(p) }}
                className={`px-4 py-2 rounded-lg border text-sm transition ${
                  selected?.id === p.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                    : 'border-gray-300 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {properties.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p>Primero registrá tu propiedad en "Mi propiedad"</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="animate-pulse">Analizando el mercado...</p>
        </div>
      )}

      {analysis && selected && !loading && (
        <div className="space-y-6">
          {/* Rango de precio estimado */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4 opacity-80 text-sm">
              <TrendingUp size={16} />
              Rango de precio estimado — {selected.title}
            </div>
            <div className="flex items-end gap-6">
              <div>
                <div className="text-xs opacity-70 mb-1">Mínimo</div>
                <div className="text-3xl font-bold">{formatUSD(analysis.estimatedPrice.min)}</div>
              </div>
              <div className="text-2xl opacity-50 pb-1">—</div>
              <div>
                <div className="text-xs opacity-70 mb-1">Máximo</div>
                <div className="text-3xl font-bold">{formatUSD(analysis.estimatedPrice.max)}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
              <div>
                <div className="text-xs opacity-70">Precio/m² promedio</div>
                <div className="font-semibold">USD {analysis.pricePerM2.avg.toLocaleString('es-AR')}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Confianza del análisis</div>
                <div className="font-semibold">{Math.round(analysis.confidenceScore * 100)}%</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Comparables encontrados</div>
                <div className="font-semibold">{analysis.comparables.length}</div>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{analysis.observations}</p>
          </div>

          {/* Gráfico */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Precio/m² de propiedades comparables</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}`} />
                  <Tooltip formatter={(v: number) => [`USD ${v.toLocaleString('es-AR')}/m²`, 'Precio/m²']} />
                  <ReferenceLine y={analysis.pricePerM2.median} stroke="#6366f1" strokeDasharray="4 2" label={{ value: 'Mediana', fill: '#6366f1', fontSize: 11 }} />
                  <Bar dataKey="precio" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Propiedades comparables */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Propiedades comparables ({analysis.comparables.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {analysis.comparables.slice(0, 9).map(l => (
                <PropertyCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm p-6">Cargando...</div>}>
      <AnalysisContent />
    </Suspense>
  )
}
