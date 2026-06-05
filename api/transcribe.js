/* Voice-to-text proxy: receives an audio blob from the lead form,
 * sends it to ElevenLabs Speech-to-Text (Scribe) for transcription
 * AND uploads it to Cloudinary so the lead webhook payload can
 * include a clickable link to the original recording.
 *
 * Returns: { text, recording_url? }
 *   - text:          the transcribed message
 *   - recording_url: secure Cloudinary URL (omitted if upload fails or
 *                    Cloudinary isn't configured — transcription is
 *                    treated as the load-bearing operation).
 *
 * Required env vars (set in Vercel):
 *   ELEVENLABS_API_KEY      — ElevenLabs Scribe-enabled key
 *   CLOUDINARY_CLOUD_NAME   — e.g. "1cleanair"
 *   CLOUDINARY_API_KEY      — Cloudinary API key
 *   CLOUDINARY_API_SECRET   — Cloudinary API secret (server-side only)
 */

export const config = { runtime: 'edge' };

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const MODEL_ID = 'scribe_v1';
const MAX_BYTES = 25 * 1024 * 1024;
const CLOUDINARY_FOLDER = '1ca-voice-leads';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return jsonResponse({ error: 'Transcription service not configured.' }, 503);

  let incoming;
  try {
    incoming = await req.formData();
  } catch {
    return jsonResponse({ error: 'Invalid form data.' }, 400);
  }

  const file = incoming.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return jsonResponse({ error: 'Missing audio file.' }, 400);
  }
  if (file.size > MAX_BYTES) return jsonResponse({ error: 'Audio too large.' }, 413);

  const rawLang = incoming.get('language_code');
  const langCode = typeof rawLang === 'string' && rawLang ? rawLang : null;

  /* Run transcription and Cloudinary upload in parallel — neither
     depends on the other, and the user is waiting on this response. */
  const [transcript, recordingUrl] = await Promise.all([
    transcribe(file, langCode, apiKey),
    uploadToCloudinary(file).catch(() => null),
  ]);

  if (!transcript.ok) {
    return jsonResponse({ error: transcript.error }, transcript.status);
  }

  return jsonResponse({
    text: transcript.text,
    ...(recordingUrl ? { recording_url: recordingUrl } : {}),
  });
}

async function transcribe(file, langCode, apiKey) {
  const fd = new FormData();
  fd.append('file', file, file.name || 'recording.webm');
  fd.append('model_id', MODEL_ID);
  if (langCode) fd.append('language_code', langCode);

  let upstream;
  try {
    upstream = await fetch(ELEVENLABS_URL, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: fd,
    });
  } catch {
    return { ok: false, status: 502, error: 'Transcription service unreachable.' };
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const msg = data?.detail?.message || data?.detail || data?.error || 'Transcription failed.';
    return { ok: false, status: upstream.status, error: typeof msg === 'string' ? msg : 'Transcription failed.' };
  }
  return { ok: true, text: data.text || '' };
}

/* Cloudinary signed upload — audio uses the `video` resource type.
   Returns the secure_url, or null if anything is missing/broken
   (caller treats the URL as optional). */
async function uploadToCloudinary(file) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  // Params must be sorted alphabetically by key, joined as k=v with &.
  const paramsToSign = `folder=${CLOUDINARY_FOLDER}&timestamp=${timestamp}`;
  const signature = await sha1Hex(paramsToSign + apiSecret);

  const fd = new FormData();
  fd.append('file', file, file.name || 'recording.webm');
  fd.append('api_key', apiKey);
  fd.append('timestamp', String(timestamp));
  fd.append('signature', signature);
  fd.append('folder', CLOUDINARY_FOLDER);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.secure_url || null;
}

async function sha1Hex(str) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
