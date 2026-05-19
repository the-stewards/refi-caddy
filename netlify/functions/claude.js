// Serverless proxy — keeps the Anthropic API key off the client.
// Accessible at /api/claude via the redirect in netlify.toml.

const TRUSTED_ORIGINS = [
  'superb-bombolone-eb5336.netlify.app',
  'stewards.loan',
  'localhost',
];

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const origin  = (event.headers['origin']  || '');
  const referer = (event.headers['referer'] || '');
  const source  = origin || referer;
  if (!TRUSTED_ORIGINS.some(h => source.includes(h))) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'API key not configured on server.' } }),
    };
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: event.body,
    });

    const data = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: { 'Content-Type': 'application/json' },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: err.message } }),
    };
  }
};
