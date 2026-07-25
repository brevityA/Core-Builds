/**
 * Cloudflare Worker — Contact endpoint
 *
 * Add this to your existing CORS proxy worker.
 * The Discord webhook URL is stored as a Worker secret/env var, never in client JS.
 *
 * Setup:
 *   1. In Cloudflare Dashboard → Workers → your worker → Settings → Variables
 *   2. Add: DISCORD_WEBHOOK_URL = https://discord.com/api/webhooks/.../...
 *   3. Deploy this code
 */

// ── Add this handler to your existing worker ──

async function handleContact(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { name, email, category, message, setup } = body;
  if (!name || !message) {
    return new Response(JSON.stringify({ error: 'Name and message required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (message.length > 2000) {
    return new Response(JSON.stringify({ error: 'Message too long' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const safeName = (name || '').replace(/[<>]/g, '').slice(0, 100);
  const safeEmail = (email || '').replace(/[<>]/g, '').slice(0, 200);
  const safeMessage = (message || '').replace(/[<>]/g, '').slice(0, 2000);
  const safeSetup = (setup || '').slice(0, 500);
  const safeCategory = ['Bug', 'Feature', 'Question', 'Feedback'].includes(category) ? category : 'Feedback';

  const colors = { Bug: 0xf87171, Feature: 0x00d4ff, Question: 0xfbbf24, Feedback: 0x34d399 };
  const embed = {
    title: `📬 New ${safeCategory} message`,
    color: colors[safeCategory] || 0x8b949e,
    fields: [
      { name: 'Name', value: safeName, inline: true },
      { name: 'Category', value: safeCategory, inline: true },
      { name: 'Message', value: safeMessage },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `Core Builds Contact · ${ip.slice(0, 8)}...` },
  };

  if (safeEmail) embed.fields.push({ name: 'Email', value: safeEmail, inline: true });
  if (safeSetup) embed.fields.push({ name: 'Setup', value: safeSetup, inline: false });

  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Core Builds Contact',
        avatar_url: 'https://raw.githubusercontent.com/brevityA/Core-Builds/main/Assets/core_icon.svg',
        embeds: [embed],
      }),
    });

    if (res.ok || res.status === 204) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Discord rejected the message' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to reach Discord' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// ── Integration with existing worker ──
//
// In your worker's main fetch handler, add:
//
//   if (url.pathname === '/contact') {
//     return handleContact(request, env);
//   }
//
// Set DISCORD_WEBHOOK_URL as a Worker secret in Cloudflare Dashboard.
