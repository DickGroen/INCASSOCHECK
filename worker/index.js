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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const klantEmail = formData.get('email') || 'onbekend';
      const klantNaam = formData.get('naam') || 'onbekend';

      if (!file) {
        return jsonResponse({ ok: false, error: 'Geen bestand ontvangen' }, 400);
      }

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
        await sendAdminEmail(env, {
          naam: klantNaam,
          email: klantEmail,
          bestandsnaam: file.name,
          base64,
          route: 'HUMAN REVIEW VEREIST',
          triage
        });

        await sendCustomerFallback(env, {
          email: klantEmail,
          naam: klantNaam,
          scheduledAt: getVolgendedag16u()
        });

        return jsonResponse({ ok: true, route: 'HUMAN_REVIEW' });
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

      // simpele utf-8 -> base64 voor mail attachments
      const bezwaarRtfB64 = btoa(unescape(encodeURIComponent(bezwaarRtf)));
      const analyseRtfB64 = btoa(unescape(encodeURIComponent(analyseRtf)));

      const routeLabel =
        route === 'ESCALATE_TO_SONNET'
          ? 'SONNET (complex)'
          : 'HAIKU (standaard)';

      await sendAdminEmail(env, {
        naam: klantNaam,
        email: klantEmail,
        bestandsnaam: file.name,
        base64,
        route: routeLabel,
        triage
      });

      await sendCustomerEmail(env, {
        email: klantEmail,
        naam: klantNaam,
        scheduledAt: getVolgendedag16u(),
        attachments: [
          { filename: 'Incasso-Analyse.rtf', content: analyseRtfB64 },
          { filename: 'Bezwaarschrift.rtf', content: bezwaarRtfB64 }
        ]
      });

      return jsonResponse({ ok: true, route });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }
};
