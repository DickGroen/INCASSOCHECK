import { callClaude } from './claude.js';

const TRIAGE_PROMPT = `Je bent een juridisch triage-assistent gespecialiseerd in Nederlandse incassozaken.

Je taak:
Lees de bijgevoegde incassobrief en geef ALLEEN een geldig JSON-object terug dat door een backend gebruikt kan worden om automatisch de juiste vervolgstap te bepalen.

BELANGRIJK:
- Geef GEEN uitleg
- Geef GEEN markdown
- Geef GEEN code fence
- Geef ALLEEN geldig JSON
- Als informatie ontbreekt, gebruik null of een lege array
- Wees conservatief met confidence scores
- Kies HUMAN_REVIEW alleen bij echt juridisch risicovolle gevallen

Gebruik exact deze JSON-structuur:

{
  "document_type": "incassobrief|aanmaning|sommatie|deurwaardersbrief|dagvaarding|onbekend",
  "detected_party": "string of null",
  "original_creditor": "string of null",
  "reference_number": "string of null",
  "amount_total": null,
  "deadline_detected": false,
  "deadline_date": null,
  "missing_information": false,
  "missing_information_items": [],
  "potential_objection_grounds": [
    {
      "title": "string",
      "strength": "strong|possible|weak",
      "reason": "string"
    }
  ],
  "complexity_level": "low|medium|high",
  "confidence_score": 1,
  "legal_risk_flag": false,
  "recommended_route": "HANDLE_WITH_HAIKU|ESCALATE_TO_SONNET|HUMAN_REVIEW",
  "recommended_next_step": "generate_objection_letter|request_more_information|escalate|human_review"
}

BEOORDELINGSREGELS:

1. document_type
- "dagvaarding" of "deurwaardersbrief" als het document gerechtelijke of deurwaardersachtige kenmerken heeft
- anders "incassobrief", "aanmaning", "sommatie" of "onbekend"

2. amount_total
- geef een getal terug zonder euroteken als het totaalbedrag duidelijk vermeld staat
- anders null

3. deadline_detected en deadline_date
- deadline_detected = true als een uiterste betaaldatum of reactiedatum duidelijk in de brief staat
- deadline_date in formaat YYYY-MM-DD als afleidbaar
- anders null

4. missing_information
- true als belangrijke onderdelen ontbreken, zoals:
  - onderliggende factuur of contract
  - specificatie van hoofdsom, rente en kosten
  - duidelijke omschrijving van de vordering
  - eerdere herinneringen of 14-dagenbrief
  - berekening van rente of incassokosten

5. potential_objection_grounds
- noem alleen realistische mogelijke bezwaargronden
- formuleer voorzichtig
- gebruik strength:
  - strong = duidelijk en concreet
  - possible = aannemelijk maar niet zeker
  - weak = twijfelachtig of beperkt bruikbaar

6. complexity_level
- low = standaard, duidelijke brief, eenvoudige vordering
- medium = enige onduidelijkheid, maar nog redelijk overzichtelijk
- high = meerdere partijen, tegenstrijdige informatie, onduidelijke basis, juridisch zwaarder

7. confidence_score
- 1–3 = zeer onzeker / te weinig informatie
- 4–6 = twijfelachtig / gemengd beeld
- 7–10 = redelijk duidelijk en betrouwbaar te beoordelen

8. legal_risk_flag
- true bij:
  - dagvaarding
  - deurwaardersbrief
  - executie, beslag, rechtbank, vonnis of gerechtelijke procedure
- anders false

9. recommended_route
- HANDLE_WITH_HAIKU = standaardcase, voldoende duidelijk
- ESCALATE_TO_SONNET = twijfel, hogere complexiteit, of confidence lager dan 7
- HUMAN_REVIEW = gerechtelijk of juridisch risicovol

10. recommended_next_step
- generate_objection_letter = voldoende basis voor bezwaarbrief
- request_more_information = eerst extra info nodig
- escalate = door naar sterker model
- human_review = niet automatisch afhandelen

ROUTINGREGELS:
- document_type = dagvaarding of deurwaardersbrief → HUMAN_REVIEW
- legal_risk_flag = true → HUMAN_REVIEW
- confidence_score < 7 → ESCALATE_TO_SONNET
- complexity_level = high → ESCALATE_TO_SONNET
- amount_total > 2500 → ESCALATE_TO_SONNET
- anders → HANDLE_WITH_HAIKU

Antwoord uitsluitend met geldig JSON.`;

// Fix 3: volledige fallback met alle velden die door index.js en consumers verwacht worden
const TRIAGE_FALLBACK = {
  document_type: 'onbekend',
  detected_party: null,
  original_creditor: null,
  reference_number: null,
  amount_total: null,
  deadline_detected: false,
  deadline_date: null,
  missing_information: true,
  missing_information_items: [],
  potential_objection_grounds: [],
  complexity_level: 'high',
  confidence_score: 3,
  legal_risk_flag: false,
  recommended_route: 'ESCALATE_TO_SONNET',
  recommended_next_step: 'escalate'
};

// Fix 2: valideer dat de kritieke routing-velden aanwezig en van het juiste type zijn
function isGeldigTriageResultaat(obj) {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    typeof obj.confidence_score === 'number' &&
    typeof obj.complexity_level === 'string' &&
    typeof obj.legal_risk_flag === 'boolean'
  );
}

export async function runTriage(env, base64, mediaType) {
  const raw = await callClaude(env, {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1500, // Fix 4: was 1000 — voorkomt afgekapte JSON bij complexe brieven
    base64,
    mediaType,
    prompt: TRIAGE_PROMPT
  });

  // Fix 1: extraheer het eerste {...}-blok, ook als er tekst voor of na staat
  const match = raw.match(/\{[\s\S]*\}/);
  const cleaned = match ? match[0] : '';

  try {
    const parsed = JSON.parse(cleaned);

    // Fix 2: val terug op fallback als kritieke velden ontbreken of verkeerd type hebben
    if (!isGeldigTriageResultaat(parsed)) {
      return TRIAGE_FALLBACK;
    }

    return parsed;
  } catch {
    // Fix 3: volledige fallback in plaats van kaal object
    return TRIAGE_FALLBACK;
  }
}
