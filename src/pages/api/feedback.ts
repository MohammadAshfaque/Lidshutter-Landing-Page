import type { APIRoute } from 'astro';
import { site } from '../../data/site';

export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Emails the message to site.supportEmail through Resend (set RESEND_API_KEY, and optionally FEEDBACK_FROM).
export const POST: APIRoute = async ({ request }) => {
  let data: Record<string, unknown> = {};
  try { data = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }

  const email = String(data.email ?? '').trim().slice(0, 200);
  const message = String(data.message ?? '').trim().slice(0, 5000);
  if (String(data.website ?? '')) return json({ ok: true }); // honeypot
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 3) {
    return json({ error: 'Please enter a valid email and a message.' }, 400);
  }

  const key = import.meta.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!key) return json({ error: 'Feedback is not set up yet. Please email us directly.' }, 503);

  const from = import.meta.env.FEEDBACK_FROM ?? process.env.FEEDBACK_FROM ?? 'LidShutter <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [site.supportEmail],
      reply_to: email,
      subject: `LidShutter feedback from ${email}`,
      text: `From: ${email}\n\n${message}`,
    }),
  });
  if (!res.ok) return json({ error: 'Could not send right now. Please try again.' }, 502);
  return json({ ok: true });
};
