import type { Database } from './supabase/types'

type Listing = Database['public']['Tables']['property_listings']['Row']
type Urgency = 'high' | 'medium' | 'low'

// Fatores de ajuste por urgência (sobre o preço mediano)
const URGENCY_FACTORS: Record<Urgency, { min: number; max: number }> = {
  high:   { min: -0.15, max: -0.05 },   // urgente: 5-15% abaixo
  medium: { min: -0.05, max: 0.05 },    // normal: ±5%
  low:    { min: 0.05,  max: 0.15 },    // pode esperar: 5-15% acima
}

function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  return values.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface AnalysisResult {
  comparables: Listing[]
  pricePerM2: { avg: number; min: number; max: number; median: number }
  estimatedPrice: { min: number; max: number }
  confidenceScore: number
  observations: string
}

export function analyzePrice(
  comparables: Listing[],
  targetM2: number,
  urgency: Urgency
): AnalysisResult {
  if (comparables.length === 0) {
    return {
      comparables: [],
      pricePerM2: { avg: 0, min: 0, max: 0, median: 0 },
      estimatedPrice: { min: 0, max: 0 },
      confidenceScore: 0,
      observations: 'No se encontraron propiedades comparables en la zona.',
    }
  }

  // Calcular preço/m² de cada comparável
  const rawRatios = comparables
    .filter(l => l.price && l.m2_total && l.m2_total > 0)
    .map(l => l.price! / l.m2_total!)

  const ratios = removeOutliers(rawRatios)

  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length
  const med = median(ratios)
  const minR = Math.min(...ratios)
  const maxR = Math.max(...ratios)

  // Estimar preço base (usando mediana — menos sensível a outliers)
  const basePrice = med * targetM2

  // Aplicar fator de urgência
  const factor = URGENCY_FACTORS[urgency]
  const estimatedMin = Math.round(basePrice * (1 + factor.min))
  const estimatedMax = Math.round(basePrice * (1 + factor.max))

  // Confiança: mais comparáveis = mais confiança
  const confidenceScore = Math.min(1, comparables.length / 10)

  const urgencyText = {
    high: 'alta urgencia de venta (rango ajustado a la baja)',
    medium: 'urgencia normal',
    low: 'baja urgencia (podés esperar para obtener mejor precio)',
  }[urgency]

  const observations = [
    `Análisis basado en ${comparables.length} propiedad${comparables.length !== 1 ? 'es' : ''} comparable${comparables.length !== 1 ? 's' : ''}.`,
    `Precio promedio de mercado: USD ${Math.round(avg).toLocaleString('es-AR')}/m².`,
    `Considerando ${urgencyText}.`,
    `Nota: los precios publicados generalmente incluyen un margen de negociación del 5-15%. El precio de cierre suele ser menor al publicado.`,
  ].join(' ')

  return {
    comparables,
    pricePerM2: { avg: Math.round(avg), min: Math.round(minR), max: Math.round(maxR), median: Math.round(med) },
    estimatedPrice: { min: estimatedMin, max: estimatedMax },
    confidenceScore,
    observations,
  }
}

export function calcOpportunityScore(listing: Listing, avgPricePerM2: number): number {
  if (!listing.price || !listing.m2_total || listing.m2_total === 0 || avgPricePerM2 === 0) return 0
  const listingRatio = listing.price / listing.m2_total
  return (avgPricePerM2 - listingRatio) / avgPricePerM2
}
