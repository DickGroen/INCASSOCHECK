// Fix 1: escape alle user-input vóór gebruik in HTML — voorkomt XSS in admin- en klant-mails
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Fix 2: lees Resend-foutberichten als JSON met fallback naar plaintext
async function resendFout(res, label) {
  let body;
  try {
    const json = await res.json();
    body = json.message || JSON.stringify(json);
  } catch {
    body = await res.text();
  }
  throw new Error(`Resend fout (${label}): ${body}`);
}

export async function sendAdminEmail(env, { naam, email, bestandsnaam, base64, route, triage }) {
  // Fix 3: check bestandsgrootte vóór verzending — base64 is ~33% groter dan het origineel
  const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB base64-safe grens
  const attachmentSize = Math.ceil(base64.length * 0.75);
  const attachments = attachmentSize <= MAX_ATTACHMENT_BYTES
    ? [{ filename: bestandsnaam, content: base64 }]
    : [];
  const grootteWaarschuwing = attachmentSize > MAX_ATTACHMENT_BYTES
    ? `<p style="color:#b45309;background:#fef3c7;padding:10px;border-radius:6px;">
        ⚠️ Bestand te groot voor bijlage (${Math.round(attachmentSize / 1024 / 1024)} MB) — niet meegestuurd.
       </p>`
    : '';

  // Fix 1: escapeHtml op alle user-input in de HTML-body
  const triageInfo =
    `<p><strong>Route:</strong> ${escapeHtml(route)}</p>` +
    `<p><strong>Bedrag:</strong> ${escapeHtml(triage.amount_total ?? 'onbekend')}</p>` +
    `<p><strong>Complexiteit:</strong> ${escapeHtml(triage.complexity_level ?? 'onbekend')}</p>` +
    `<p><strong>Confidence:</strong> ${escapeHtml(triage.confidence_score ?? 'onbekend')}/10</p>` +
    `<p><strong>Juridisch risico:</strong> ${triage.legal_risk_flag ? 'JA' : 'nee'}</p>`;

  const adminRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Incasso Check <noreply@incasso-check.nl>',
      to: ['info@incasso-check.nl'],
      subject: `Nieuwe aanvraag [${route}]: ${escapeHtml(naam)} (${escapeHtml(email)})`,
      html:
        `<h2>Nieuwe aanvraag</h2>` +
        grootteWaarschuwing +
        `<p><strong>Naam:</strong> ${escapeHtml(naam)}</p>` +
        `<p><strong>Email:</strong> ${escapeHtml(email)}</p><hr>` +
        triageInfo,
      attachments
    })
  });

  // Fix 2: leesbare foutmelding via resendFout helper
  if (!adminRes.ok) await resendFout(adminRes, 'admin');
}

export async function sendCustomerFallback(env, { email, naam, scheduledAt }) {
  const fallbackRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Incasso Check <noreply@incasso-check.nl>',
      to: [email],
      subject: 'Uw aanvraag is ontvangen - Incasso Check NL',
      scheduled_at: scheduledAt,
      html:
        '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;">' +
        '<div style="background:#1b3a8c;padding:24px 28px;">' +
        '<h1 style="color:#fff;margin:0;font-size:20px;">Uw aanvraag is ontvangen</h1>' +
        '</div>' +
        '<div style="padding:24px 28px;">' +
        // Fix 1: escapeHtml op naam
        `<p>Beste <strong>${escapeHtml(naam)}</strong>,</p>` +
        '<p>Uw incassobrief is ontvangen en wordt beoordeeld door ons team.</p>' +
        '<p style="background:#fff3cd;padding:14px;border-radius:8px;border-left:4px solid #f59e0b;">' +
        'Deze brief lijkt juridisch complexer dan standaard incassozaken. Daarom geven we geen automatische analyse. Ons team neemt contact met u op.' +
        '</p>' +
        '<p>U ontvangt uiterlijk morgen een reactie van ons.</p>' +
        '<p style="color:#6b7280;font-size:13px;">Incasso Check NL &middot; info@incasso-check.nl</p>' +
        '</div></div>'
    })
  });

  // Fix 2
  if (!fallbackRes.ok) await resendFout(fallbackRes, 'fallback');
}

export async function sendCustomerEmail(env, { email, naam, scheduledAt, attachments }) {
  const customerRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Incasso Check <noreply@incasso-check.nl>',
      to: [email],
      subject: 'Uw incasso-analyse is klaar - Incasso Check NL',
      scheduled_at: scheduledAt,
      // Fix 1: naam wordt geëscaped binnen makeIntroEmail
      html: makeIntroEmail(naam),
      attachments
    })
  });

  // Fix 2
  if (!customerRes.ok) await resendFout(customerRes, 'klant');
}

function makeIntroEmail(naam) {
  // Fix 1: escapeHtml op naam
  const veiligNaam = escapeHtml(naam);
  return '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;">'
    + '<div style="background:#1b3a8c;padding:24px 28px;">'
    + '<h1 style="color:#fff;margin:0;font-size:20px;">Uw analyse is klaar</h1>'
    + '<p style="color:#a5b4d4;margin:4px 0 0;font-size:13px;">Incasso Check NL</p>'
    + '</div>'
    + '<div style="padding:24px 28px;background:#f8faff;border-left:4px solid #1b3a8c;">'
    + `<p style="margin:0;">Beste <strong>${veiligNaam}</strong>,</p>`
    + '<p style="margin:10px 0 0;color:#374151;">Uw incasso-analyse is klaar. U vindt de bijlagen in deze e-mail.</p>'
    + '</div>'
    + '<div style="padding:20px 28px;">'
    + '<div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:12px;">'
    + '<p style="margin:0;font-weight:bold;color:#1b3a8c;">Bijlage 1: Incasso-Analyse.rtf</p>'
    + '<p style="margin:4px 0 0;color:#374151;font-size:14px;">De juridische analyse — open in Word.</p>'
    + '</div>'
    + '<div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;">'
    + '<p style="margin:0;font-weight:bold;color:#1b3a8c;">Bijlage 2: Bezwaarschrift.rtf</p>'
    + '<p style="margin:4px 0 0;color:#374151;font-size:14px;">Kant-en-klare bezwaarbrief — open in Word, vul je naam in en stuur op.</p>'
    + '</div>'
    + '</div>'
    + '<div style="padding:16px 28px;background:#f1f5f9;border-top:1px solid #e5e7eb;">'
    + '<p style="margin:0;font-size:13px;color:#6b7280;">Incasso Check NL &middot; <a href="mailto:info@incasso-check.nl" style="color:#1b3a8c;">info@incasso-check.nl</a></p>'
    + '<p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Dit rapport is geen juridisch advies.</p>'
    + '</div>'
    + '</div>';
}
