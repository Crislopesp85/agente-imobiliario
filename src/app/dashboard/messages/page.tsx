'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageSquare } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Message = Database['public']['Tables']['messages']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export default function MessagesPage() {
  const [contacts, setContacts] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadContacts()
  }, [])

  useEffect(() => {
    if (selected) loadMessages(selected.id)
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadContacts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Busca todos os usuários com quem já trocou mensagens
    const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', user.id)
    const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', user.id)

    const ids = new Set([
      ...(sent || []).map(m => m.receiver_id),
      ...(received || []).map(m => m.sender_id),
    ])

    if (ids.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', [...ids])
      setContacts(profiles || [])
    }
  }

  async function loadMessages(contactId: string) {
    if (!userId) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    // Marca como lidos
    await supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('receiver_id', userId).eq('sender_id', contactId).is('read_at', null)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !newMessage.trim() || !userId) return
    setSending(true)

    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: selected.id,
      content: newMessage.trim(),
    })

    setNewMessage('')
    await loadMessages(selected.id)
    setSending(false)
  }

  const roleLabel: Record<string, string> = {
    buyer: 'Comprador', seller: 'Vendedor', both: 'Comprador/Vendedor', agent: 'Agente'
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Lista de contatos */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h1 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-600" />
            Mensajes
          </h1>
        </div>

        {contacts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400 text-sm p-4">
            <p>No tenés conversaciones todavía.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {contacts.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${selected?.id === c.id ? 'bg-indigo-50' : ''}`}
              >
                <div className="font-medium text-gray-900 text-sm">{c.name || 'Sin nombre'}</div>
                <div className="text-xs text-gray-400">{roleLabel[c.role] || c.role}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Seleccioná una conversación</p>
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-gray-200 px-5 py-3">
              <div className="font-semibold text-gray-900">{selected.name}</div>
              <div className="text-xs text-gray-400">{roleLabel[selected.role]}</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => {
                const isOwn = m.sender_id === userId
                return (
                  <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                      isOwn ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                    }`}>
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 p-4 flex gap-3">
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Escribí un mensaje..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
