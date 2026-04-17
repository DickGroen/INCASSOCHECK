import { callClaude } from './claude.js';
import { fixMojibake } from './utils.js';

// Fix 1 & 4: gebruik haiku.txt en sonnet.txt als prompts, verwijder inline ANALYSE_PROMPT.
// wrangler.toml heeft [[rules]] type="Text" globs=["prompts/**/*.txt"] — imports werken direct.
import HAIKU_PROMPT from '../prompts/haiku.txt';
import SONNET_PROMPT from '../prompts/sonnet.txt';

export async function generateAnalyse(env, { route, base64, mediaType }) {
  const isSonnet = route === 'ESCALATE_TO_SONNET';

  const model = isSonnet ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  // Fix 1: selecteer prompt op basis van route
  const prompt = isSonnet ? SONNET_PROMPT : HAIKU_PROMPT;

  // Fix 3: Sonnet krijgt meer ruimte vanwege uitgebreidere output-structuur
  const maxTokens = isSonnet ? 5500 : 4500;

  // Fix 1: Sonnet krijgt meer timeout-ruimte vanwege hogere maxTokens en complexere output
  const timeoutMs = isSonnet ? 45000 : 25000;

  const raw = await callClaude(env, {
    model,
    maxTokens,
    timeoutMs,
    base64,
    mediaType,
    prompt
  });

  const output = fixMojibake(raw || '');

  // Fix 2: valideer aanwezigheid van markers vóór return
  // Ontbrekende markers betekent afgekapte of afwijkende output — splitRapport zou dan falen
  if (!output.includes('[BRIEFHOOFD_START]') || !output.includes('[BRIEFHOOFD_EIND]')) {
    throw new Error('Generatie onvolledig: [BRIEFHOOFD_START] of [BRIEFHOOFD_EIND] ontbreekt in output');
  }

  return output;
}
