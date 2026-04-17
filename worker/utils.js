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

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
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

    const analyse = toelichting ? analyseBase + ' ' + toelichting : analyseBase;
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

export function maakRtfDocument(tekst) {
  const lines = tekst.split('\n');
  let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}}{\\colortbl;\\red27\\green58\\blue140;}\\f0\\fs24\\sa200\\sl280\\slmult1 ';

  for (let line of lines) {
    if (line === '') {
      rtf += '\\par ';
      continue;
    }

    line = line.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
    line = line.replace(/\u20ac/g, '\\u8364?');
    line = line.replace(/\u00eb/g, '\\u235?');
    line = line.replace(/\u00e9/g, '\\u233?');
    line = line.replace(/\u00e8/g, '\\u232?');
    line = line.replace(/\u00f6/g, '\\u246?');
    line = line.replace(/\u00fc/g, '\\u252?');
    line = line.replace(/\u00e0/g, '\\u224?');
    line = line.replace(/\u2013/g, '\\u8211?');
    line = line.replace(/\u2014/g, '\\u8212?');
    line = line.replace(/\*\*([^*]+)\*\*/g, '{\\b $1}');

    if (line.match(/^#{1,4} /)) {
      const kop = line.replace(/^#{1,4} /, '');
      rtf += '\\pard\\sb200{\\b\\cf1\\fs26 ' + kop + '}\\par\\pard ';
      continue;
    }

    if (line.indexOf('- ') === 0) {
      rtf += '\\pard\\fi-360\\li360\\bullet\\tab ' + line.substring(2) + '\\par\\pard ';
    } else {
      rtf += line + '\\par ';
    }
  }

  rtf += '}';
  return rtf;
}

export function maakAnalyseRtfMetTabel(tekst) {
  // houdt het nu simpel: analyse als gewone RTF
  return maakRtfDocument(tekst);
}
