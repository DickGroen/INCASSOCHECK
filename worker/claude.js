export async function callClaude(env, { model, base64, mediaType, prompt, maxTokens = 2000 }) {
  // Fix 5: abort na 25s zodat de worker niet abrupt time-out bij een hangende Claude-response
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              mediaType === 'application/pdf'
                ? {
                    type: 'document',
                    source: { type: 'base64', media_type: mediaType, data: base64 }
                  }
                : {
                    type: 'image',
                    source: { type: 'base64', media_type: mediaType, data: base64 }
                  },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      })
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Claude API time-out na 25 seconden');
    }
    throw err;
  }

  clearTimeout(timeout);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Claude API fout: ${JSON.stringify(data)}`);
  }

  return data?.content?.[0]?.text || '';
}
