export async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    base64: btoa(binary),
    mediaType: file.type || 'application/pdf'
  };
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}

export function getVolgendedag16u() {
  const nu = new Date();
  const morgen = new Date(nu);
  morgen.setDate(morgen.getDate() + 1);
  morgen.setHours(14, 0, 0, 0);
  return morgen.toISOString();
}

export function splitRapport(rapport) {
  const startMarker = '[BRIEFHOOFD_START]';
  const endMarker = '[BRIEFHOOFD_EIND]';
  const startIdx = rapport.indexOf(startMarker);
  const endIdx = rapport.indexOf(endMarker);

  if (startIdx !== -1) {
    const analyseBase = rapport.substring(0, startIdx).trim();
    const bezwaar = rapport.substring(
      startIdx + startMarker.length,
      endIdx !== -1 ? endIdx : undefined
    ).trim();
    const toelichting = endIdx !== -1
      ? rapport.substring(endIdx + endMarker.length).trim()
      : '';

    const analyse = toelichting ? analyseBase + '\n\n' + toelichting : analyseBase;
    return { analyse, bezwaar };
  }

  const briefMarkers = ['Geachte heer', 'Geachte mevrouw', 'Geachte heer/mevrouw'];
  let splitIndex = -1;

  for (const marker of briefMarkers) {
    const idx = rapport.indexOf(marker);
    if (idx !== -1) {
      splitIndex = idx;
      break;
    }
  }

  if (splitIndex === -1) {
    return { analyse: rapport, bezwaar: '' };
  }

  return {
    analyse: rapport.substring(0, splitIndex).trim(),
    bezwaar: rapport.substring(splitIndex).trim()
  };
}

export function fixMojibake(rapportRaw) {
  let rapport = rapportRaw || '';
  let fixed = '';
  let i = 0;

  while (i < rapport.length) {
    const c1 = rapport.charCodeAt(i);
    const c2 = i + 1 < rapport.length ? rapport.charCodeAt(i + 1) : 0;
    const c3 = i + 2 < rapport.length ? rapport.charCodeAt(i + 2) : 0;

    if (c1 === 0xE2 && c2 === 0x82 && c3 === 0xAC) {
      fixed += '€'; i += 3;
    } else if (c1 === 0xC3 && c2 === 0xAB) {
      fixed += 'ë'; i += 2;
    } else if (c1 === 0xC3 && c2 === 0xA9) {
      fixed += 'é'; i += 2;
    } else if (c1 === 0xC3 && c2 === 0xA8) {
      fixed += 'è'; i += 2;
    } else if (c1 === 0xC3 && c2 === 0xB6) {
      fixed += 'ö'; i += 2;
    } else if (c1 === 0xC3 && c2 === 0xBC) {
      fixed += 'ü'; i += 2;
    } else if (c1 === 0xC3 && c2 === 0xA0) {
      fixed += 'à'; i += 2;
    } else {
      fixed += rapport[i];
      i++;
    }
  }

  return fixed;
}

// ── RTF HELPERS ─────────────────────────────────────────────────────────────

function escapeRtf(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/&nbsp;/g, ' ')           // fix: HTML-entiteit → spatie
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u20ac/g, '\\u8364?')   // €
    .replace(/\u00eb/g, '\\u235?')    // ë
    .replace(/\u00e9/g, '\\u233?')    // é
    .replace(/\u00e8/g, '\\u232?')    // è
    .replace(/\u00f6/g, '\\u246?')    // ö
    .replace(/\u00fc/g, '\\u252?')    // ü
    .replace(/\u00e0/g, '\\u224?')    // à
    .replace(/\u2013/g, '\\u8211?')   // –
    .replace(/\u2014/g, '\\u8212?');  // —
}

function applyInlineFormatting(line) {
  // **vet** → RTF bold
  return line.replace(/\*\*([^*]+)\*\*/g, '{\\b $1}');
}

function rtfHeader() {
  return '{\\rtf1\\ansi\\ansicpg1252\\deff0'
    + '{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}}'
    + '{\\colortbl;\\red27\\green58\\blue140;}'
    + '\\f0\\fs24\\sa200\\sl280\\slmult1 ';
}

// Zet een markdown-tabel om naar een RTF-tabel
function maakRtfTabel(rows) {
  // Verwijder scheidingsrijen (---|---|---)
  const dataRows = rows.filter(r => !r.replace(/[\s|:-]/g, ''));
  const filtered = rows.filter(r => !/^[\s|:\-]+$/.test(r));

  if (filtered.length === 0) return '';

  // Bereken kolombreedtes — verdeel 8640 twips (ca. 15cm) gelijkmatig
  const cols = filtered[0].split('|').filter(c => c.trim() !== '');
  const colCount = cols.length;
  const colWidth = Math.floor(8640 / colCount);

  let rtf = '';
  filtered.forEach((row, rowIdx) => {
    const cells = row.split('|').filter(c => c.trim() !== '');
    rtf += '\\trowd\\trgaph108\\trleft0';

    // Definieer celgrenzen
    for (let c = 0; c < colCount; c++) {
      rtf += `\\cellx${(c + 1) * colWidth}`;
    }

    // Celinhoud
    cells.forEach((cell, ci) => {
      const inhoud = escapeRtf(cell.trim());
      const opgemaakt = applyInlineFormatting(inhoud);
      if (rowIdx === 0) {
        // Eerste rij = koptekst in bold
        rtf += `\\pard\\intbl{\\b ${opgemaakt}}\\cell `;
      } else {
        rtf += `\\pard\\intbl ${opgemaakt}\\cell `;
      }
    });

    rtf += '\\row ';
  });

  return rtf + '\\pard\\sa200 ';
}

export function maakRtfDocument(tekst) {
  const lines = tekst.split('\n');
  let rtf = rtfHeader();
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];

    // Fix: sla lege scheidingslijnen (---) over
    if (/^[-–—]{2,}\s*$/.test(line.trim())) {
      i++;
      continue;
    }

    // Fix: verzamel en render markdown-tabel
    if (line.trim().startsWith('|')) {
      const tabelRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tabelRows.push(lines[i]);
        i++;
      }
      rtf += maakRtfTabel(tabelRows);
      continue;
    }

    // Lege regel
    if (line.trim() === '') {
      rtf += '\\par ';
      i++;
      continue;
    }

    // Escape en inline opmaak toepassen
    line = escapeRtf(line);
    line = applyInlineFormatting(line);

    // Koptekst ## / ### etc.
    if (/^#{1,4} /.test(line)) {
      const kop = line.replace(/^#{1,4} /, '');
      rtf += '\\pard\\sb200{\\b\\cf1\\fs26 ' + kop + '}\\par\\pard ';
      i++;
      continue;
    }

    // Bullet: - of •
    if (/^[-•]\s/.test(line)) {
      const inhoud = line.replace(/^[-•]\s/, '');
      rtf += '\\pard\\fi-360\\li360\\bullet\\tab ' + inhoud + '\\par\\pard ';
      i++;
      continue;
    }

    // Gewone alinea
    rtf += line + '\\par ';
    i++;
  }

  rtf += '}';
  return rtf;
}

// Analyse gebruikt dezelfde volwaardige converter
export function maakAnalyseRtfMetTabel(tekst) {
  return maakRtfDocument(tekst);
}
