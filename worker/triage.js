import { callClaude } from './claude.js';

const TRIAGE_PROMPT = `Je bent een juridisch triage-assistent. Lees deze brief en geef ALLEEN een geldig JSON-object terug. Geen uitleg, geen markdown, geen code fence. Gebruik exact deze structuur: {"document_type":"incassobrief|aanmaning|sommatie|deurwaardersbrief|dagvaarding|onbekend","detected_party":"string or null","original_creditor":"string or null","reference_number":"string or null","amount_total":number or null,"deadline_detected":true or false,"deadline_date":"YYYY-MM-DD or null","missing_information":true or false,"missing_information_items":["string"],"potential_objection_grounds":[{"title":"string","strength":"strong|possible|weak","reason":"string"}],"complexity_level":"low|medium|high","confidence_score":integer 1-10,"legal_risk_flag":true or false,"recommended_route":"HANDLE_WITH_HAIKU|ESCALATE_TO_SONNET|HUMAN_REVIEW","recommended_next_step":"generate_objection_letter|request_more_information|escalate|human_review"}. Regels: dagvaarding of deurwaardersbrief maakt legal_risk_flag true. confidence lager dan 7 bij onduidelijke info. complexity high bij meerdere partijen of tegenstrijdige informatie. amount_total groter dan 2500 of complexity high of confidence lager dan 7 betekent ESCALATE_TO_SONNET.`;

export async function runTriage(env, base64, mediaType) {
  const raw = await callClaude(env, {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1000,
    base64,
    mediaType,
    prompt: TRIAGE_PROMPT
  });

  const cleaned = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // veiliger dan default HANDLE_WITH_HAIKU
    return {
      document_type: 'onbekend',
      complexity_level: 'high',
      confidence_score: 3,
      legal_risk_flag: false,
      recommended_route: 'ESCALATE_TO_SONNET'
    };
  }
}
