'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Plus, Edit2, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

type SellerProperty = Database['public']['Tables']['seller_properties']['Row']

const AMENITIES = ['garage', 'pileta', 'balcon', 'terraza', 'quincho', 'seguridad', 'ascensor', 'calefaccion']

export default function MyPropertyPage() {
  const [properties, setProperties] = useState<SellerProperty[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadProperties()
  }, [])

  async function loadProperties() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('seller_properties').select('*').eq('seller_id', user.id).order('created_at', { ascending: false })
    setProperties(data || [])
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi propiedad</h1>
          <p className="text-gray-500 mt-1">Registrá la propiedad que querés vender</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={16} />
          Nueva propiedad
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : properties.length === 0 && !showForm ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Todavía no registraste ninguna propiedad</p>
          <p className="text-sm mt-1 mb-4">Registrala para obtener el análisis de precio del mercado</p>
          <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            Registrar propiedad
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {properties.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{p.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.status === 'active' ? 'bg-green-100 text-green-700' :
                  p.status === 'sold' ? 'bg-gray-100 text-gray-500' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {p.status === 'active' ? 'Activa' : p.status === 'sold' ? 'Vendida' : 'Borrador'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-3">{p.neighborhood}, {p.city}</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span>{p.m2_total} m²</span>
                <span>{p.rooms} amb.</span>
                <span>{p.bathrooms} baño{p.bathrooms !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/analysis?property=${p.id}`}
                  className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                >
                  <BarChart3 size={13} />
                  Analizar precio
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <PropertyForm onSaved={() => { setShowForm(false); loadProperties() }} onCancel={() => setShowForm(false)} />}
    </div>
  )
}

function PropertyForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    title: '', address: '', neighborhood: '', city: 'Buenos Aires',
    m2_total: '', m2_covered: '', rooms: '', bathrooms: '', parking: '',
    description: '', urgency: 'medium', currency: 'USD',
  })
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleAmenity(a: string) {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const amenities = Object.fromEntries(selectedAmenities.map(a => [a, true]))

    await supabase.from('seller_properties').insert({
      seller_id: user.id,
      title: form.title,
      address: form.address,
      neighborhood: form.neighborhood,
      city: form.city,
      m2_total: Number(form.m2_total),
      m2_covered: form.m2_covered ? Number(form.m2_covered) : null,
      rooms: Number(form.rooms),
      bathrooms: Number(form.bathrooms),
      parking: form.parking ? Number(form.parking) : 0,
      description: form.description || null,
      urgency: form.urgency as any,
      currency: form.currency as any,
      amenities,
      status: 'active',
    })

    setSaving(false)
    onSaved()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">Registrar propiedad</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Título" required>
            <input value={form.title} onChange={e => set('title', e.target.value)} required className={inputCls} placeholder="Departamento 3 ambientes en Palermo" />
          </Field>
          <Field label="Dirección" required>
            <input value={form.address} onChange={e => set('address', e.target.value)} required className={inputCls} placeholder="Av. Santa Fe 1234" />
          </Field>
          <Field label="Barrio" required>
            <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} required className={inputCls} placeholder="Palermo" />
          </Field>
          <Field label="Ciudad">
            <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
          </Field>
          <Field label="M² totales" required>
            <input type="number" value={form.m2_total} onChange={e => set('m2_total', e.target.value)} required min="10" className={inputCls} placeholder="80" />
          </Field>
          <Field label="M² cubiertos">
            <input type="number" value={form.m2_covered} onChange={e => set('m2_covered', e.target.value)} className={inputCls} placeholder="70" />
          </Field>
          <Field label="Ambientes" required>
            <input type="number" value={form.rooms} onChange={e => set('rooms', e.target.value)} required min="1" className={inputCls} placeholder="3" />
          </Field>
          <Field label="Baños" required>
            <input type="number" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} required min="1" className={inputCls} placeholder="1" />
          </Field>
          <Field label="Urgencia de venta">
            <select value={form.urgency} onChange={e => set('urgency', e.target.value)} className={inputCls}>
              <option value="high">Alta (necesito vender rápido)</option>
              <option value="medium">Normal</option>
              <option value="low">Baja (puedo esperar)</option>
            </select>
          </Field>
          <Field label="Moneda">
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </Field>
        </div>

        <Field label="Comodidades">
          <div className="flex flex-wrap gap-2 mt-1">
            {AMENITIES.map(a => (
              <button
                key={a} type="button"
                onClick={() => toggleAmenity(a)}
                className={`text-xs px-3 py-1 rounded-full border transition capitalize ${selectedAmenities.includes(a) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Descripción">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls} placeholder="Detalles adicionales sobre la propiedad..." />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar propiedad'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
