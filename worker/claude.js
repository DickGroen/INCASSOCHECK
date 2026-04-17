export async function callClaude(env, { model, base64, mediaType, prompt, maxTokens = 2000, timeoutMs = 25000 }) {
  // Fix 1: timeoutMs is nu configureerbaar — Sonnet-aanroepen kunnen meer tijd krijgen
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2024-10-22', // Fix 4: update van 2023-06-01 naar huidige stabiele versie
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
      throw new Error(`Claude API time-out na ${timeoutMs / 1000} seconden`);
    }
    throw err;
  }

  clearTimeout(timeout);

  // Fix 3: retry bij transiënte overbelasting (429 / 529) met 2s delay
  if (res.status === 429 || res.status === 529) {
    await new Promise(r => setTimeout(r, 2000));
    throw new Error(`Claude API tijdelijk niet beschikbaar (${res.status}) — probeer opnieuw`);
  }

  // Fix 2: vang ongeldige JSON op — bij proxy-fouten retourneert de API soms HTML
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Claude API: ongeldige JSON response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(`Claude API fout: ${JSON.stringify(data)}`);
  }

  return data?.content?.[0]?.text || '';
}
