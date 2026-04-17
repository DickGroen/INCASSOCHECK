export async function callClaude(env, { model, base64, mediaType, prompt, maxTokens = 2000 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Claude API fout: ${JSON.stringify(data)}`);
  }

  return data?.content?.[0]?.text || '';
}
