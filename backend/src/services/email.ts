/**
 * Transactional email via Brevo's HTTP API (no SDK). Without BREVO_API_KEY,
 * development prints the email to the console instead; production refuses.
 */
export interface Email {
  to: string
  subject: string
  html: string
  text: string
}

export class EmailNotConfiguredError extends Error {}

export async function sendEmail(email: Email): Promise<void> {
  const key = process.env.BREVO_API_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new EmailNotConfiguredError('BREVO_API_KEY is not set')
    console.log(`[email] (not sent, no BREVO_API_KEY) to=${email.to} subject="${email.subject}"\n${email.text}`)
    return
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.BREVO_FROM_EMAIL ?? 'noreply@trailmap.app', name: 'Trailmap' },
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }),
  })
  if (!res.ok) throw new Error(`Brevo send failed: ${res.status} ${await res.text().catch(() => '')}`)
}
