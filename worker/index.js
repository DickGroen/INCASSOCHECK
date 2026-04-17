import { runTriage } from './triage.js';
import { generateAnalyse } from './generator.js';
import { sendAdminEmail, sendCustomerEmail, sendCustomerFallback } from './mailer.js';
import {
  jsonResponse,
  fileToBase64,
  getVolgendedag16u,
  splitRapport,
  maakRtfDocument,
  maakAnalyseRtfMetTabel
} from './utils.js';

// Fix 1: centrale CORS-headers helper, gebruikt door alle responses
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Fix 4: vervang deprecated btoa(unescape(encodeURIComponent(...)))
function rtfNaarBase64(rtf) {
  const bytes = new TextEncoder().encode(rtf);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Fix 1: OPTIONS preflight met CORS-headers
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // Fix 1: URL-routing — alleen /analyze accepteren
    if (url.pathname !== '/analyze') {
      return new Response('Not found', { status: 404, headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const klantEmail = formData.get('email') || 'onbekend';
      const klantNaam = formData.get('naam') || 'onbekend';

      if (!file) {
        return jsonResponse({ ok: false, error: 'Geen bestand ontvangen' }, 400, corsHeaders());
      }

      // Fix 3: file.name fallback voor het geval het een Blob zonder name is
      const bestandsnaam = file.name || 'upload.pdf';

      const { base64, mediaType } = await fileToBase64(file);

      // 1. TRIAGE
      const triage = await runTriage(env, base64, mediaType);

      // 2. ROUTING
      let route = triage.recommended_route || 'HANDLE_WITH_HAIKU';

      if (
        triage.document_type === 'dagvaarding' ||
        triage.document_type === 'deurwaardersbrief' ||
        triage.legal_risk_flag === true
      ) {
        route = 'HUMAN_REVIEW';
      } else if (
        triage.confidence_score < 7 ||
        triage.complexity_level === 'high' ||
        (triage.amount_total && triage.amount_total > 2500)
      ) {
        route = 'ESCALATE_TO_SONNET';
      }

      // 3A. HUMAN REVIEW
      if (route === 'HUMAN_REVIEW') {
        // Fix 2: parallel verzenden zodat een admin-mailfout de klant niet blokkeert
        await Promise.allSettled([
          sendAdminEmail(env, {
            naam: klantNaam,
            email: klantEmail,
            bestandsnaam,
            base64,
            route: 'HUMAN REVIEW VEREIST',
            triage
          }),
          sendCustomerFallback(env, {
            email: klantEmail,
            naam: klantNaam,
            scheduledAt: getVolgendedag16u()
          })
        ]);

        return jsonResponse({ ok: true, route: 'HUMAN_REVIEW' }, 200, corsHeaders());
      }

      // 3B. ANALYSE
      const rapport = await generateAnalyse(env, {
        route,
        base64,
        mediaType
      });

      const split = splitRapport(rapport);

      const bezwaarRtf = maakRtfDocument(split.bezwaar);
      const analyseRtf = maakAnalyseRtfMetTabel(split.analyse);

      // Fix 4: gebruik rtfNaarBase64 i.p.v. deprecated btoa(unescape(...))
      const bezwaarRtfB64 = rtfNaarBase64(bezwaarRtf);
      const analyseRtfB64 = rtfNaarBase64(analyseRtf);

      const routeLabel =
        route === 'ESCALATE_TO_SONNET'
          ? 'SONNET (complex)'
          : 'HAIKU (standaard)';

      // Fix 2: parallel verzenden zodat admin-mailfout klant-mail niet blokkeert
      await Promise.allSettled([
        sendAdminEmail(env, {
          naam: klantNaam,
          email: klantEmail,
          bestandsnaam,
          base64,
          route: routeLabel,
          triage
        }),
        sendCustomerEmail(env, {
          email: klantEmail,
          naam: klantNaam,
          scheduledAt: getVolgendedag16u(),
          attachments: [
            { filename: 'Incasso-Analyse.rtf', content: analyseRtfB64 },
            { filename: 'Bezwaarschrift.rtf', content: bezwaarRtfB64 }
          ]
        })
      ]);

      return jsonResponse({ ok: true, route }, 200, corsHeaders());
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500, corsHeaders());
    }
  }
};
