// Cloudflare Worker: receives the recorded video from the Mini App and sends it to the user's chat with the bot.
// Setup: npx wrangler deploy   then   npx wrangler secret put BOT_TOKEN
// Optional variable ALLOW_ORIGIN = your page origin (e.g. https://saman-h.github.io). Default is *.

const cors = (o) => ({
  'Access-Control-Allow-Origin': o,
  'Access-Control-Allow-Headers': 'X-Init-Data,X-File-Name,Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
});

async function hmac(key, data) {
  const raw = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const k = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');

// Validates Telegram initData and returns the user object (or null)
async function verify(initData, token) {
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  p.delete('hash');
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = await hmac('WebAppData', token);
  if (hex(await hmac(secret, check)) !== hash) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 86400) return null;
  return JSON.parse(p.get('user'));
}

export default {
  async fetch(req, env) {
    const h = cors(env.ALLOW_ORIGIN || '*');
    try {
      if (req.method === 'OPTIONS') return new Response(null, { headers: h });
      if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: h });
      if (!env.BOT_TOKEN) return new Response('BOT_TOKEN secret is missing', { status: 500, headers: h });

      const user = await verify(req.headers.get('X-Init-Data') || '', env.BOT_TOKEN);
      if (!user) return new Response('bad initData (check BOT_TOKEN)', { status: 401, headers: h });

      const type = (req.headers.get('Content-Type') || 'video/mp4').split(';')[0];
      const name = (req.headers.get('X-File-Name') || 'saman-chords.mp4').replace(/[^\w.-]/g, '_');
      const blob = await req.blob();
      if (blob.size > 49 * 1048576) return new Response('file too big', { status: 413, headers: h });

      // MP4 plays inline as a video; WEBM is sent as a file
      const isMp4 = type === 'video/mp4';
      const fd = new FormData();
      fd.append('chat_id', String(user.id));
      fd.append(isMp4 ? 'video' : 'document', blob, name);
      if (isMp4) fd.append('supports_streaming', 'true');
      fd.append('caption', '🎹 Saman Chords');

      const r = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/${isMp4 ? 'sendVideo' : 'sendDocument'}`,
        { method: 'POST', body: fd }
      );
      return new Response(r.ok ? 'ok' : 'telegram: ' + (await r.text()), { status: r.ok ? 200 : 502, headers: h });
    } catch (e) {
      // always answer with CORS headers, so the app shows the real reason instead of "Failed to fetch"
      return new Response('worker error: ' + e.message, { status: 500, headers: h });
    }
  },
};
