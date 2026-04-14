import type { Database } from '@/lib/supabase/types'
import { MapPin, Maximize2, BedDouble, Bath, ExternalLink } from 'lucide-react'

type Listing = Database['public']['Tables']['property_listings']['Row']

function formatPrice(price: number | null, currency: string | null) {
  if (!price) return '—'
  const symbol = currency === 'ARS' ? '$' : 'USD'
  return `${symbol} ${price.toLocaleString('es-AR')}`
}

export default function PropertyCard({ listing, opportunityScore }: {
  listing: Listing
  opportunityScore?: number
}) {
  const pricePerM2 = listing.price && listing.m2_total
    ? Math.round(listing.price / listing.m2_total)
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
      {/* Imagen */}
      <div className="h-40 bg-gray-100 relative">
        {listing.images?.[0] ? (
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🏠</div>
        )}

        {/* Badge del portal */}
        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full capitalize">
          {listing.portal}
        </span>

        {/* Oportunidad */}
        {opportunityScore !== undefined && opportunityScore > 0 && (
          <span className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
            {Math.round(opportunityScore * 100)}% bajo mercado
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Precio */}
        <div className="text-xl font-bold text-gray-900 mb-1">
          {formatPrice(listing.price, listing.currency)}
        </div>

        {pricePerM2 && (
          <div className="text-xs text-gray-400 mb-2">
            {listing.currency === 'ARS' ? '$' : 'USD'} {pricePerM2.toLocaleString('es-AR')}/m²
          </div>
        )}

        {/* Título */}
        <p className="text-sm text-gray-700 font-medium line-clamp-2 mb-3">{listing.title}</p>

        {/* Ubicación */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
          <MapPin size={12} />
          {[listing.neighborhood, listing.city].filter(Boolean).join(', ')}
        </div>

        {/* Atributos */}
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {listing.m2_total && (
            <span className="flex items-center gap-1">
              <Maximize2 size={12} />
              {listing.m2_total} m²
            </span>
          )}
          {listing.rooms && (
            <span className="flex items-center gap-1">
              <BedDouble size={12} />
              {listing.rooms} amb.
            </span>
          )}
          {listing.bathrooms && (
            <span className="flex items-center gap-1">
              <Bath size={12} />
              {listing.bathrooms} baño{listing.bathrooms !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Link al portal */}
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mt-3 text-xs text-indigo-600 hover:underline"
        >
          Ver en {listing.portal}
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}
