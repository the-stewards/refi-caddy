// Serverless proxy — keeps the Anthropic API key off the client.
// Mounted at /api/claude via the config export below.

const TRUSTED_ORIGINS = [
  'superb-bombolone-eb5336.netlify.app',
  'stewards.loan',
  'localhost',
];

export default async (req) => {
  // Only POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Reject requests not originating from our own domains
  const origin  = req.headers.get('origin')  || '';
  const referer = req.headers.get('referer') || '';
  const source  = origin || referer;
  if (!TRUSTED_ORIGINS.some(h => source.includes(h))) {
    return new Response('Forbidden', { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: 'API key not configured on server.' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body     = await req.text();
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-api-key':        apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    });

    const data = await upstream.text();
    return new Response(data, {
      status:  upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: err.message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config = { path: '/api/claude' };
