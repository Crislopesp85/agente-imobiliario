'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/lib/supabase/types'
import { Home, Search, TrendingUp, Briefcase } from 'lucide-react'

const ROLES: { value: UserRole; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'buyer',
    label: 'Comprador',
    desc: 'Estoy buscando una propiedad para comprar',
    icon: <Search size={28} />,
  },
  {
    value: 'seller',
    label: 'Vendedor',
    desc: 'Tengo una propiedad y quiero conocer su valor',
    icon: <TrendingUp size={28} />,
  },
  {
    value: 'both',
    label: 'Comprador y Vendedor',
    desc: 'Quiero vender y también buscar otra propiedad',
    icon: <Home size={28} />,
  },
  {
    value: 'agent',
    label: 'Agente Inmobiliario',
    desc: 'Represento a compradores y/o vendedores',
    icon: <Briefcase size={28} />,
  },
]

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    if (!role || !name) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada. Volvé a iniciar sesión.'); setLoading(false); return }

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, name, phone, role }, { onConflict: 'id' })

    if (updateError) {
      setError('Error al guardar: ' + updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <Home className="text-indigo-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">Agente Imobiliário</h1>
        </div>

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">¿Cómo te llamás?</h2>
            <p className="text-sm text-gray-500 mb-6">Estos datos son solo para personalizar tu experiencia.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Cristiane López"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+54 9 11 ..."
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!name}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              Continuar
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">¿Qué querés hacer?</h2>
            <p className="text-sm text-gray-500 mb-6">Podés cambiar esto más adelante desde tu perfil.</p>

            <div className="grid grid-cols-1 gap-3 mb-6">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition ${
                    role === r.value
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <span className={role === r.value ? 'text-indigo-600' : 'text-gray-400'}>
                    {r.icon}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900">{r.label}</div>
                    <div className="text-sm text-gray-500">{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Volver
              </button>
              <button
                onClick={handleSubmit}
                disabled={!role || loading}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Comenzar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
