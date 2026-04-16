'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Save, CheckCircle } from 'lucide-react'

type Role = 'buyer' | 'seller' | 'both' | 'agent'

const roleOptions: { value: Role; label: string; desc: string }[] = [
  { value: 'buyer', label: 'Comprador', desc: 'Quiero encontrar propiedades para comprar' },
  { value: 'seller', label: 'Vendedor', desc: 'Quiero vender mi propiedad al mejor precio' },
  { value: 'both', label: 'Comprador y Vendedor', desc: 'Busco comprar y también tengo una propiedad para vender' },
  { value: 'agent', label: 'Agente Inmobiliario', desc: 'Gestiono múltiples clientes compradores y vendedores' },
]

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('buyer')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setRole(profile.role || 'buyer')
    }
    setLoading(false)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await (supabase as any)
      .from('profiles')
      .upsert({ id: user.id, name, phone, role, updated_at: new Date().toISOString() })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return <p className="text-gray-400 text-sm">Cargando...</p>
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 mt-1">Actualizá tus datos y preferencias</p>
      </div>

      <form onSubmit={saveProfile} className="space-y-6">
        {/* Datos personales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={16} />
            Datos personales
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+54 11 1234 5678"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tipo de perfil */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">¿Cómo usás el sistema?</h2>
          <div className="space-y-3">
            {roleOptions.map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition ${
                  role === opt.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-200'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={role === opt.value}
                  onChange={() => setRole(opt.value)}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <div className="font-medium text-gray-900 text-sm">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !name}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {saved ? (
            <>
              <CheckCircle size={16} />
              Guardado
            </>
          ) : (
            <>
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
