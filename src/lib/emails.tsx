import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Agente Imobiliário <no-reply@agente-imob.com>'

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Bienvenido a Agente Imobiliário 🏠',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="color:#4f46e5">¡Hola, ${name}!</h1>
        <p>Tu cuenta está lista. Ya podés empezar a buscar propiedades o analizar el precio de la tuya.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
           style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">
          Ir al panel
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">Agente Imobiliário — Argentina</p>
      </div>
    `,
  })
}

export async function sendOpportunityEmail(
  to: string,
  name: string,
  opportunities: { title: string; price: string; neighborhood: string; url: string }[]
) {
  const items = opportunities
    .map(
      o => `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px">
          <strong style="color:#111827">${o.title}</strong><br/>
          <span style="color:#4f46e5;font-size:18px;font-weight:700">${o.price}</span><br/>
          <span style="color:#6b7280;font-size:13px">${o.neighborhood}</span><br/>
          <a href="${o.url}" style="color:#4f46e5;font-size:13px">Ver propiedad →</a>
        </div>
      `
    )
    .join('')

  await resend.emails.send({
    from: FROM,
    to,
    subject: `🏠 ${opportunities.length} nueva${opportunities.length !== 1 ? 's' : ''} oportunidad${opportunities.length !== 1 ? 'es' : ''} para vos`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#4f46e5">Nuevas oportunidades, ${name}</h2>
        <p style="color:#374151">Encontramos propiedades que encajan con tus criterios y están por debajo del precio de mercado:</p>
        ${items}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/opportunities"
           style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">
          Ver todas las oportunidades
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">Agente Imobiliário — Argentina</p>
      </div>
    `,
  })
}

export async function sendAnalysisReadyEmail(
  to: string,
  name: string,
  propertyTitle: string,
  priceMin: number,
  priceMax: number,
  propertyId: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `📊 Análisis de precio listo para "${propertyTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#4f46e5">Análisis completado, ${name}</h2>
        <p style="color:#374151">El análisis de mercado para tu propiedad <strong>${propertyTitle}</strong> está listo.</p>
        <div style="background:#f0f0ff;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
          <div style="color:#6b7280;font-size:13px;margin-bottom:4px">Rango estimado de precio</div>
          <div style="color:#4f46e5;font-size:24px;font-weight:700">
            USD ${priceMin.toLocaleString('es-AR')} — USD ${priceMax.toLocaleString('es-AR')}
          </div>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analysis?property=${propertyId}"
           style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Ver análisis completo
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">Agente Imobiliário — Argentina</p>
      </div>
    `,
  })
}

export async function sendNewMessageEmail(
  to: string,
  senderName: string,
  preview: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `💬 Nuevo mensaje de ${senderName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#4f46e5">Nuevo mensaje</h2>
        <p style="color:#374151"><strong>${senderName}</strong> te envió un mensaje:</p>
        <blockquote style="border-left:3px solid #4f46e5;padding-left:16px;color:#374151;margin:16px 0">
          ${preview}
        </blockquote>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/messages"
           style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Ver mensajes
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">Agente Imobiliário — Argentina</p>
      </div>
    `,
  })
}
