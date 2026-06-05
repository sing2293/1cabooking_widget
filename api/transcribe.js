/* Voice-to-text proxy: receives an audio blob from the lead form,
 * forwards it to ElevenLabs Speech-to-Text (Scribe), returns the
 * transcript. Keeps ELEVENLABS_API_KEY server-side. */

export const config = { runtime: 'edge' };

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const MODEL_ID = 'scribe_v1';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — well above any reasonable form-message dictation

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'Transcription service not configured.' }, 503);
  }

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
  if (file.size > MAX_BYTES) {
    return jsonResponse({ error: 'Audio too large.' }, 413);
  }

  const rawLang = incoming.get('language_code');
  const langCode = typeof rawLang === 'string' && rawLang ? rawLang : null;

  const outgoing = new FormData();
  outgoing.append('file', file, file.name || 'recording.webm');
  outgoing.append('model_id', MODEL_ID);
  if (langCode) outgoing.append('language_code', langCode);

  let upstream;
  try {
    upstream = await fetch(ELEVENLABS_URL, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: outgoing,
    });
  } catch {
    return jsonResponse({ error: 'Transcription service unreachable.' }, 502);
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const msg = data?.detail?.message || data?.detail || data?.error || 'Transcription failed.';
    return jsonResponse({ error: typeof msg === 'string' ? msg : 'Transcription failed.' }, upstream.status);
  }

  return jsonResponse({ text: data.text || '' });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
