import type { Language, ApuntesMode } from '../types';

export interface ApuntesParsedData {
  curso: string;
  temaNum: string;
  titulo: string;
  subtitulo: string;
  bloques: string[];
  contentTypst: string;
}

function sanitizeTypst(text: string): string {
  if (!text) return "";
  return text
    .replace(/"/g, '\\"')
    .replace(/<(?=[0-9a-zA-Z_%])/g, '\\<');
}

export function generateApuntesTypst(markdown: string, mode: ApuntesMode, lang: Language): string {
  // Filtrar bloques según el modo
  let processedMd = markdown;
  if (mode === 'abreviado') {
    processedMd = processedMd.replace(/<!--\s*solo-extendido\s*-->[\s\S]*?<!--\s*fin-extendido\s*-->/gi, '');
    processedMd = processedMd.replace(/:::extendido[\s\S]*?:::/gi, '');
  } else {
    processedMd = processedMd.replace(/<!--\s*solo-extendido\s*-->/gi, '');
    processedMd = processedMd.replace(/<!--\s*fin-extendido\s*-->/gi, '');
    processedMd = processedMd.replace(/:::extendido/gi, '');
    processedMd = processedMd.replace(/:::/gi, '');
  }

  // Extraer metadatos
  const isVa = lang === 'va';
  let curso = isVa ? "4t ESO • RELIGIÓ CATÒLICA" : "4º ESO • RELIGIÓN CATÓLICA";
  let temaNum = "01";
  let titulo = isVa ? "La Dignitat Humana" : "La Dignidad Humana";
  let subtitulo = isVa ? "Valor absolut i filiació divina" : "Valor absoluto y filiación divina";
  const bloques: string[] = [];

  const lines = processedMd.split('\n');
  const bodyTypst: string[] = [];

  let inQuote = false;
  let quoteType: 'CITA' | 'EJEMPLO' | 'GLOSARIO' | 'HISTORICO' | 'ARTE' | 'TESTIMONIO' | 'SABIAS_QUE' | 'PARA_PENSAR' = 'CITA';
  let quoteTitle = "";
  let quoteAuthor = "";
  const quoteLines: string[] = [];

  function flushQuote() {
    if (!inQuote) return;
    const rawBody = quoteLines.join('\n').trim();
    const safeBody = rawBody
      .replace(/"/g, '\\"')
      .replace(/<(?=[0-9a-zA-Z_%])/g, '\\<');
    const safeTitle = sanitizeTypst(quoteTitle);
    const safeAuthor = sanitizeTypst(quoteAuthor);

    if (quoteType === 'CITA') {
      const authorArg = safeAuthor ? `"${safeAuthor}"` : 'none';
      bodyTypst.push(`#caja-cita([${safeBody}], autor: ${authorArg})`);
    } else if (quoteType === 'EJEMPLO') {
      const t = safeTitle || (isVa ? 'EXEMPLE DEL DIA A DIA' : 'EJEMPLO DEL DÍA A DÍA');
      bodyTypst.push(`#caja-ejemplo(titulo: "${t}", [${safeBody}])`);
    } else if (quoteType === 'GLOSARIO') {
      const term = safeTitle || (isVa ? 'Concepte clau' : 'Concepto clave');
      bodyTypst.push(`#caja-glosario("${term}", [${safeBody}])`);
    } else if (quoteType === 'HISTORICO') {
      const t = safeTitle || (isVa ? 'UNA DADA HISTÒRICA' : 'UN DATO HISTÓRICO');
      bodyTypst.push(`#caja-dato-historico(titulo: "${t}", [${safeBody}])`);
    } else if (quoteType === 'ARTE') {
      const t = safeTitle || (isVa ? 'ART I SÍMBOL' : 'ARTE Y SÍMBOLO');
      bodyTypst.push(`#caja-arte-simbolo(titulo: "${t}", [${safeBody}])`);
    } else if (quoteType === 'TESTIMONIO') {
      const t = safeTitle || (isVa ? 'UN TESTIMONI' : 'UN TESTIMONIO');
      const personArg = safeAuthor ? `"${safeAuthor}"` : 'none';
      bodyTypst.push(`#caja-testimonio(titulo: "${t}", persona: ${personArg}, [${safeBody}])`);
    } else if (quoteType === 'SABIAS_QUE') {
      const t = safeTitle || (isVa ? 'SABIES QUE...?' : '¿SABÍAS QUE...?');
      bodyTypst.push(`#caja-sabias-que(titulo: "${t}", [${safeBody}])`);
    } else if (quoteType === 'PARA_PENSAR') {
      const prefix = safeTitle ? `#strong[${safeTitle}]\n\n` : '';
      bodyTypst.push(`#caja-para-pensar([${prefix}${safeBody}])`);
    } else {
      const authorArg = safeAuthor ? `"${safeAuthor}"` : 'none';
      bodyTypst.push(`#caja-cita([${safeBody}], autor: ${authorArg})`);
    }

    inQuote = false;
    quoteTitle = "";
    quoteAuthor = "";
    quoteLines.length = 0;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Metadatos explícitos
    if (line.startsWith('# TÍTULO:') || line.startsWith('# TITULO:') || line.startsWith('# TÍTOL:')) {
      titulo = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }
    if (line.startsWith('# SUBTÍTULO:') || line.startsWith('# SUBTITULO:') || line.startsWith('# SUBTÍTOL:')) {
      subtitulo = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }
    if (line.startsWith('# CURSO:') || line.startsWith('# CURS:')) {
      curso = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }
    if (line.startsWith('# TEMA:')) {
      temaNum = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }

    // Cabeceras alternativas de apuntes
    if (line.startsWith('# UNIDAD DIDACTICA:') || line.startsWith('# UNIDAD DIDÁCTICA:') || line.startsWith('# UNITAT DIDÀCTICA:')) {
      titulo = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }
    if (line.startsWith('## SESION') || line.startsWith('## SESIÓN') || line.startsWith('## SESSIÓ')) {
      const parts = line.split(':');
      if (parts.length > 1) {
        subtitulo = parts[1].trim();
      }
      continue;
    }

    // Bloques en metadatos
    if (line.startsWith('- **Bloque') || line.startsWith('- **Bloc')) {
      const match = line.match(/\*\*(.+?)\*\*\s*:?\s*(.+)/);
      if (match) {
        bloques.push(`${match[1].toUpperCase()}: ${match[2]}`);
      }
      continue;
    }

    // Cajas Didácticas (comienzan con '>')
    if (line.startsWith('>')) {
      const quoteContent = line.substring(1).trim();

      // Detección robusta de cabecera de caja:
      // Busca cualquier tag dentro de **[TAG]** o **TAG:**
      const boxStartMatch = quoteContent.match(/\*\*\[?([^*\]:]+?)\]?:?\*\*:?\s*(.*)/);

      if (boxStartMatch) {
        const tagUpper = boxStartMatch[1].toUpperCase().trim();
        let matchedType: 'CITA' | 'EJEMPLO' | 'GLOSARIO' | 'HISTORICO' | 'ARTE' | 'TESTIMONIO' | 'SABIAS_QUE' | 'PARA_PENSAR' | null = null;

        if (tagUpper.includes('CITA') || tagUpper.includes('MAGISTERI') || tagUpper.includes('BIBLIC')) {
          matchedType = 'CITA';
        } else if (tagUpper.includes('EJEMPLO') || tagUpper.includes('EXEMPLE')) {
          matchedType = 'EJEMPLO';
        } else if (tagUpper.includes('GLOSARIO') || tagUpper.includes('GLOSSARI')) {
          matchedType = 'GLOSARIO';
        } else if (tagUpper.includes('HISTÓRIC') || tagUpper.includes('HISTÒRIC') || tagUpper.includes('HISTORIC') || tagUpper.includes('DADA')) {
          matchedType = 'HISTORICO';
        } else if (tagUpper.includes('ARTE') || tagUpper.includes('ART') || tagUpper.includes('SÍMBOL') || tagUpper.includes('SIMBOL')) {
          matchedType = 'ARTE';
        } else if (tagUpper.includes('TESTIMONI')) {
          matchedType = 'TESTIMONIO';
        } else if (tagUpper.includes('SABÍAS') || tagUpper.includes('SABIES') || tagUpper.includes('SABIAS')) {
          matchedType = 'SABIAS_QUE';
        } else if (tagUpper.includes('PENSAR')) {
          matchedType = 'PARA_PENSAR';
        }

        if (matchedType) {
          flushQuote();
          inQuote = true;
          quoteType = matchedType;
          quoteTitle = boxStartMatch[2].trim();
          continue;
        }
      }

      if (inQuote) {
        if (quoteContent.startsWith('—') || quoteContent.startsWith('- ') || quoteContent.startsWith('-- ')) {
          quoteAuthor = quoteContent.replace(/^[—-]+\s*/, '').trim();
        } else {
          quoteLines.push(quoteContent);
        }
        continue;
      } else {
        // Cita estándar si no había caja previa
        inQuote = true;
        quoteType = 'CITA';
        quoteTitle = '';
        if (quoteContent.startsWith('—') || quoteContent.startsWith('- ') || quoteContent.startsWith('-- ')) {
          quoteAuthor = quoteContent.replace(/^[—-]+\s*/, '').trim();
        } else {
          quoteLines.push(quoteContent);
        }
        continue;
      }
    } else {
      if (inQuote) {
        flushQuote();
      }
    }

    // Separador o salto de página
    if (line === '---' || line === '***') {
      bodyTypst.push('#pagebreak()');
      continue;
    }

    // Bloque temático
    const bloqueMatch = line.match(/^# (?:BLOQUE|BLOC)\s*(\d+)[:\.]?\s*(.+)/i);
    if (bloqueMatch) {
      bodyTypst.push(`\n#bloque-banner("${bloqueMatch[1]}", "${sanitizeTypst(bloqueMatch[2])}")\n`);
      continue;
    }

    // Sección / Apartado numerado
    const seccionMatch = line.match(/^###?\s*(\d+(?:\.\d+)?)\.?\s*(.+)/);
    if (seccionMatch) {
      bodyTypst.push(`\n#seccion-header("${seccionMatch[1]}", "${sanitizeTypst(seccionMatch[2])}")\n`);
      continue;
    }

    // Encabezado nivel 3 genérico
    if (line.startsWith('###')) {
      const heading = line.replace(/^###\s*/, '').trim();
      bodyTypst.push(`\n#seccion-header("", "${sanitizeTypst(heading)}")\n`);
      continue;
    }

    // Párrafos regulares y texto
    if (line) {
      let typstParagraph = line
        .replace(/\*\*(.+?)\*\*/g, '#strong[$1]')
        .replace(/\*(.+?)\*/g, '#emph[$1]')
        .replace(/_(.+?)_/g, '#emph[$1]')
        .replace(/<(?=[0-9a-zA-Z_%])/g, '\\<');
      
      bodyTypst.push(`\n${typstParagraph}\n`);
    }
  }

  flushQuote();

  const headerLabel = isVa ? "DOSSIER D'APUNTS" : "DOSSIER DE APUNTES";
  const headerVersion = mode === 'abreviado' ? (isVa ? " (VERSIÓ ABREUJADA)" : " (VERSIÓN ABREVIADA)") : "";
  const subtitleFinal = mode === 'abreviado' ? `${subtitulo} • ${isVa ? "Versió abreujada de repàs" : "Versión abreviada de repaso"}` : subtitulo;

  const bloquesGrid = bloques.length > 0 
    ? bloques.slice(0, 4).map(b => `box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(b)}]]`).join(',\n      ')
    : `box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${isVa ? "BLOC 1: FONAMENTS" : "BLOQUE 1: FUNDAMENTOS"}]],
       box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${isVa ? "BLOC 2: DESENVOLUPAMENT" : "BLOQUE 2: DESARROLLO"}]],
       box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${isVa ? "BLOC 3: APLICACIÓ" : "BLOQUE 3: APLICACIÓN"}]],
       box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${isVa ? "BLOC 4: COMPROMÍS" : "BLOQUE 4: COMPROMISO"}]]`;

  return `// ==============================================================================
// APUNTES OFICIALES • RELIGIÓN CATÓLICA
// Generado automáticamente con Sistema de Diseño Pastel (10.9pt Georgia)
// ==============================================================================

#set document(
  title: "${sanitizeTypst(titulo)}",
  author: "${isVa ? "Departament de Religió Catòlica" : "Departamento de Religión Católica"}"
)

#set page(
  paper: "a4",
  margin: (top: 1.8cm, bottom: 1.7cm, left: 1.55cm, right: 1.55cm),
  header-ascent: 0.55cm,
  footer-descent: 0.55cm,
  header: context {
    if counter(page).get().first() > 1 [
      #grid(
        columns: (1fr, auto),
        align: (left + bottom, right + bottom),
        text(7.8pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(curso)} • ${sanitizeTypst(titulo.toUpperCase())}],
        text(7.8pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "bold")[${headerLabel}${headerVersion}]
      )
      #v(2.5pt)
      #line(length: 100%, stroke: 0.6pt + rgb("#CAD2C5"))
    ]
  },
  footer: context [
    #line(length: 100%, stroke: 0.6pt + rgb("#E0E7E3"))
    #v(3.5pt)
    #grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      text(7.2pt, fill: rgb("#52796F"), font: "Helvetica Neue")[${isVa ? "Departament de Religió Catòlica" : "Departamento de Religión Católica"} • ${headerLabel}],
      box(
        fill: rgb("#EDF4F2"),
        radius: 3pt,
        inset: (x: 6pt, y: 2.5pt),
        stroke: 0.5pt + rgb("#CAD2C5"),
        text(7.5pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${isVa ? "Pàgina" : "Página"} #counter(page).display("1 de 1", both: true)]
      )
    )
  ]
)

#set text(
  font: ("Georgia", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", "serif"),
  size: 10.9pt,
  fill: rgb("#263238"),
  lang: "${isVa ? 'ca' : 'es'}"
)

#set par(
  justify: true,
  leading: 0.54em,
  spacing: 0.95em
)

#let tamano-caja-texto = 10.2pt

// ==============================================================================
// ICONOS VECTORIALES INTEGRADOS (SVG NATIVO EN TYPST)
// ==============================================================================
#let icon-cita = image(bytes("<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#5E4B8B\\\" stroke-width=\\\"2.2\\\" stroke-linecap=\\\"round\\\" stroke-linejoin=\\\"round\\\"><path d=\\\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z\\\"/><path d=\\\"M6 2v20\\\"/></svg>"), format: "svg", width: 10.5pt, height: 10.5pt)
#let icon-ejemplo = image(bytes("<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#287261\\\" stroke-width=\\\"2.2\\\" stroke-linecap=\\\"round\\\" stroke-linejoin=\\\"round\\\"><path d=\\\"M9 18h6\\\"/><path d=\\\"M10 22h4\\\"/><path d=\\\"M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5z\\\"/></svg>"), format: "svg", width: 10.5pt, height: 10.5pt)
#let icon-glosario = image(bytes("<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#2D4B73\\\" stroke-width=\\\"2.2\\\" stroke-linecap=\\\"round\\\" stroke-linejoin=\\\"round\\\"><path d=\\\"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z\\\"/></svg>"), format: "svg", width: 10.5pt, height: 10.5pt)
#let icon-historia = image(bytes("<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#8C6219\\\" stroke-width=\\\"2.2\\\" stroke-linecap=\\\"round\\\" stroke-linejoin=\\\"round\\\"><line x1=\\\"3\\\" y1=\\\"22\\\" x2=\\\"21\\\" y2=\\\"22\\\"/><line x1=\\\"6\\\" y1=\\\"18\\\" x2=\\\"6\\\" y2=\\\"11\\\"/><line x1=\\\"10\\\" y1=\\\"18\\\" x2=\\\"10\\\" y2=\\\"11\\\"/><line x1=\\\"14\\\" y1=\\\"18\\\" x2=\\\"14\\\" y2=\\\"11\\\"/><line x1=\\\"18\\\" y1=\\\"18\\\" x2=\\\"18\\\" y2=\\\"11\\\"/><polygon points=\\\"12 2 20 7 4 7\\\"/></svg>"), format: "svg", width: 10.5pt, height: 10.5pt)
#let icon-arte = image(bytes("<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#9C414D\\\" stroke-width=\\\"2.2\\\" stroke-linecap=\\\"round\\\" stroke-linejoin=\\\"round\\\"><circle cx=\\\"13.5\\\" cy=\\\"6.5\\\" r=\\\".5\\\" fill=\\\"#9C414D\\\"/><circle cx=\\\"17.5\\\" cy=\\\"10.5\\\" r=\\\".5\\\" fill=\\\"#9C414D\\\"/><circle cx=\\\"8.5\\\" cy=\\\"7.5\\\" r=\\\".5\\\" fill=\\\"#9C414D\\\"/><circle cx=\\\"6.5\\\" cy=\\\"12.5\\\" r=\\\".5\\\" fill=\\\"#9C414D\\\"/><path d=\\\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z\\\"/></svg>"), format: "svg", width: 10.5pt, height: 10.5pt)
#let icon-testimonio = image(bytes("<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#265B88\\\" stroke-width=\\\"2.2\\\" stroke-linecap=\\\"round\\\" stroke-linejoin=\\\"round\\\"><path d=\\\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\\\"/><circle cx=\\\"12\\\" cy=\\\"7\\\" r=\\\"4\\\"/></svg>"), format: "svg", width: 10.5pt, height: 10.5pt)
#let icon-sabias = image(bytes("<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#1D6B5A\\\" stroke-width=\\\"2.2\\\" stroke-linecap=\\\"round\\\" stroke-linejoin=\\\"round\\\"><circle cx=\\\"12\\\" cy=\\\"12\\\" r=\\\"10\\\"/><path d=\\\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\\\"/><line x1=\\\"12\\\" y1=\\\"17\\\" x2=\\\"12.01\\\" y2=\\\"17\\\"/></svg>"), format: "svg", width: 10.5pt, height: 10.5pt)
#let icon-pensar = image(bytes("<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#B85D26\\\" stroke-width=\\\"2.2\\\" stroke-linecap=\\\"round\\\" stroke-linejoin=\\\"round\\\"><circle cx=\\\"12\\\" cy=\\\"12\\\" r=\\\"10\\\"/><polygon points=\\\"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76\\\"/></svg>"), format: "svg", width: 10.5pt, height: 10.5pt)

// ==============================================================================
// 1. MACROS DE ESTRUCTURA Y CABECERA EDITORIAL
// ==============================================================================

#let cabecera-editorial() = [
  #block(
    width: 100%,
    fill: rgb("#EDF4F2"),
    radius: 6pt,
    inset: (x: 14pt, y: 11pt),
    stroke: 1.2pt + rgb("#84A98C"),
    [
      #grid(
        columns: (1fr, auto),
        align: (left + horizon, right + horizon),
        [
          #box(
            fill: rgb("#52796F"),
            radius: 3pt,
            inset: (x: 6pt, y: 3pt),
            text(7.5pt, fill: white, font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(curso)}]
          )
          #v(3.5pt)
          #text(18pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(titulo)}]
          #v(2.5pt)
          #text(9.5pt, fill: rgb("#52796F"), font: "Georgia", style: "italic")[${sanitizeTypst(subtitleFinal)}]
        ],
        [
          #box(
            fill: white,
            radius: 5pt,
            stroke: 1pt + rgb("#CAD2C5"),
            inset: (x: 9pt, y: 5.5pt),
            align(center)[
              #text(7pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[TEMA]\\
              #text(16.5pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "extrabold")[${sanitizeTypst(temaNum)}]\\
              #text(6.5pt, fill: rgb("#84A98C"), font: "Helvetica Neue")[${mode === 'abreviado' ? (isVa ? 'ABREUJAT' : 'ABREVIADO') : 'OFICIAL'}]
            ]
          )
        ]
      )
      #v(4.5pt)
      #line(length: 100%, stroke: 0.6pt + rgb("#CAD2C5"))
      #v(3.5pt)
      #grid(
        columns: (1fr, 1fr, 1fr, 1fr),
        gutter: 5pt,
        align: center,
        ${bloquesGrid}
      )
    ]
  )
  #v(5pt)
]

#let bloque-banner(num, title) = [
  #v(6pt)
  #grid(
    columns: (auto, 1fr),
    gutter: 7pt,
    align: (center + horizon, left + horizon),
    box(
      fill: rgb("#52796F"),
      radius: 3pt,
      inset: (x: 7.5pt, y: 3.5pt),
      text(8.5pt, fill: white, weight: "bold", font: "Helvetica Neue")[${isVa ? "BLOC" : "BLOQUE"} #num]
    ),
    text(11.8pt, fill: rgb("#2F3E46"), weight: "bold", font: "Helvetica Neue")[#title]
  )
  #v(2.5pt)
  #line(length: 100%, stroke: 1pt + rgb("#84A98C"))
  #v(3pt)
]

#let seccion-header(num, title) = [
  #v(5pt)
  #grid(
    columns: (auto, 1fr),
    gutter: 5pt,
    align: (left + horizon, left + horizon),
    if num != "" [
      #box(
        fill: rgb("#EDF4F2"),
        radius: 3pt,
        inset: (x: 5.5pt, y: 2pt),
        stroke: 0.5pt + rgb("#CAD2C5"),
        text(8.8pt, fill: rgb("#52796F"), weight: "bold", font: "Helvetica Neue")[#num]
      )
    ] else [],
    text(11.4pt, fill: rgb("#2F3E46"), weight: "bold", font: "Helvetica Neue")[#title]
  )
  #v(2pt)
]

// ==============================================================================
// 2. CATÁLOGO DIDÁCTICO PASTEL (8 CAJAS NORMALIZADAS CON ICONOGRAFÍA VECTORIAL)
// ==============================================================================

// 1. Cita Bíblica / Magisterio (Tono Lavanda)
#let caja-cita(cita, autor: none, exegesis: none) = [
  #v(4.5pt)
  #block(
    width: 100%,
    fill: rgb("#F7F4FB"),
    stroke: (left: 3.5pt + rgb("#9B87C2"), rest: 0.6pt + rgb("#E3D9F3")),
    radius: (right: 5pt),
    inset: (x: 10pt, y: 6.5pt),
    breakable: false,
    [
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        align: horizon,
        icon-cita,
        text(8.5pt, fill: rgb("#5E4B8B"), weight: "bold", font: "Helvetica Neue")[${isVa ? "CITA BÍBLICA / MAGISTERI" : "CITA BÍBLICA / MAGISTERIO"}]
      )
      #v(2.5pt)
      #set text(size: tamano-caja-texto, style: "italic", fill: rgb("#263238"))
      #cita
      #if exegesis != none [
        #v(2pt)
        #set text(size: tamano-caja-texto, style: "normal", fill: rgb("#263238"))
        #exegesis
      ]
      #if autor != none [
        #v(2pt)
        #align(right)[
          #text(9pt, style: "normal", weight: "bold", fill: rgb("#5E4B8B"))[— #autor]
        ]
      ]
    ]
  )
  #v(3pt)
]

// 2. Ejemplo del Día a Día (Tono Menta)
#let caja-ejemplo(titulo: "${isVa ? "EXEMPLE DEL DIA A DIA" : "EJEMPLO DEL DÍA A DÍA"}", body) = [
  #v(4.5pt)
  #block(
    width: 100%,
    fill: rgb("#F0F8F5"),
    stroke: 1pt + rgb("#9BD1C2"),
    radius: 5pt,
    inset: (x: 10pt, y: 6.5pt),
    breakable: false,
    [
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        align: horizon,
        icon-ejemplo,
        text(8.5pt, fill: rgb("#287261"), weight: "bold", font: "Helvetica Neue")[#titulo]
      )
      #v(2pt)
      #line(length: 100%, stroke: 0.5pt + rgb("#C6E7DE"))
      #v(2.5pt)
      #set text(size: tamano-caja-texto, fill: rgb("#263238"))
      #body
    ]
  )
  #v(3pt)
]

// 3. Glosario Conceptual (Tono Salvia / Celeste Suave)
#let caja-glosario(termino, definicion) = [
  #v(4.5pt)
  #block(
    width: 100%,
    fill: rgb("#F0F4F8"),
    stroke: 1pt + rgb("#A2B5CD"),
    radius: 5pt,
    inset: (x: 10pt, y: 6.5pt),
    breakable: false,
    [
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        align: horizon,
        icon-glosario,
        text(8.5pt, fill: rgb("#2D4B73"), weight: "bold", font: "Helvetica Neue")[${isVa ? "GLOSSARI CONCEPTUAL" : "GLOSARIO CONCEPTUAL"}]
      )
      #v(2pt)
      #line(length: 100%, stroke: 0.5pt + rgb("#C7D5E5"))
      #v(2pt)
      #text(tamano-caja-texto, fill: rgb("#2D4B73"), weight: "bold", font: "Helvetica Neue")[• #termino]\\
      #v(1.5pt)
      #set text(size: tamano-caja-texto, fill: rgb("#263238"))
      #definicion
    ]
  )
  #v(3pt)
]

// 4. Un Dato Histórico (Tono Vainilla)
#let caja-dato-historico(titulo: "${isVa ? "UNA DADA HISTÒRICA" : "UN DATO HISTÓRICO"}", body) = [
  #v(4.5pt)
  #block(
    width: 100%,
    fill: rgb("#FEF9EE"),
    stroke: 1pt + rgb("#EBD49D"),
    radius: 5pt,
    inset: (x: 10pt, y: 6.5pt),
    breakable: false,
    [
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        align: horizon,
        icon-historia,
        text(8.5pt, fill: rgb("#8C6219"), weight: "bold", font: "Helvetica Neue")[#titulo]
      )
      #v(2pt)
      #line(length: 100%, stroke: 0.5pt + rgb("#F3E6C8"))
      #v(2.5pt)
      #set text(size: tamano-caja-texto, fill: rgb("#263238"))
      #body
    ]
  )
  #v(3pt)
]

// 5. Arte y Símbolo (Tono Rosa Empolvado)
#let caja-arte-simbolo(titulo: "${isVa ? "ART I SÍMBOL" : "ARTE Y SÍMBOLO"}", body) = [
  #v(4.5pt)
  #block(
    width: 100%,
    fill: rgb("#FDF2F4"),
    stroke: 1pt + rgb("#E8B4B8"),
    radius: 5pt,
    inset: (x: 10pt, y: 6.5pt),
    breakable: false,
    [
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        align: horizon,
        icon-arte,
        text(8.5pt, fill: rgb("#9C414D"), weight: "bold", font: "Helvetica Neue")[#titulo]
      )
      #v(2pt)
      #line(length: 100%, stroke: 0.5pt + rgb("#F5D5D8"))
      #v(2.5pt)
      #set text(size: tamano-caja-texto, fill: rgb("#263238"))
      #body
    ]
  )
  #v(3pt)
]

// 6. Un Testimonio (Tono Celeste)
#let caja-testimonio(titulo: "${isVa ? "UN TESTIMONI" : "UN TESTIMONIO"}", persona: none, body) = [
  #v(4.5pt)
  #block(
    width: 100%,
    fill: rgb("#F0F5FA"),
    stroke: 1pt + rgb("#96BFDC"),
    radius: 5pt,
    inset: (x: 10pt, y: 6.5pt),
    breakable: false,
    [
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        align: horizon,
        icon-testimonio,
        text(8.5pt, fill: rgb("#265B88"), weight: "bold", font: "Helvetica Neue")[#titulo]
      )
      #if persona != none [
        #v(1.5pt)
        #text(tamano-caja-texto, fill: rgb("#1F4462"), weight: "bold", font: "Helvetica Neue")[#persona]
      ]
      #v(2pt)
      #line(length: 100%, stroke: 0.5pt + rgb("#C7DDEF"))
      #v(2.5pt)
      #set text(size: tamano-caja-texto, fill: rgb("#263238"))
      #body
    ]
  )
  #v(3pt)
]

// 7. ¿Sabías que...? (Tono Turquesa)
#let caja-sabias-que(titulo: "${isVa ? "SABIES QUE...?" : "¿SABÍAS QUE...?"}", body) = [
  #v(4.5pt)
  #block(
    width: 100%,
    fill: rgb("#F2FAF8"),
    stroke: 1pt + rgb("#84C5B5"),
    radius: 5pt,
    inset: (x: 10pt, y: 6.5pt),
    breakable: false,
    [
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        align: horizon,
        icon-sabias,
        text(8.5pt, fill: rgb("#1D6B5A"), weight: "bold", font: "Helvetica Neue")[#titulo]
      )
      #v(2pt)
      #line(length: 100%, stroke: 0.5pt + rgb("#C2E7DE"))
      #v(2.5pt)
      #set text(size: tamano-caja-texto, fill: rgb("#263238"))
      #body
    ]
  )
  #v(3pt)
]

// 8. Para Pensar (Tono Melocotón)
#let caja-para-pensar(body) = [
  #v(4.5pt)
  #block(
    width: 100%,
    fill: rgb("#FFF6ED"),
    stroke: 1pt + rgb("#F7C59F"),
    radius: 5pt,
    inset: (x: 10pt, y: 6.5pt),
    breakable: false,
    [
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        align: horizon,
        icon-pensar,
        text(8.5pt, fill: rgb("#B85D26"), weight: "bold", font: "Helvetica Neue")[${isVa ? "PER A PENSAR • DIÀLEG I REFLEXIÓ" : "PARA PENSAR • DIÁLOGO Y REFLEXIÓN"}]
      )
      #v(2pt)
      #line(length: 100%, stroke: 0.5pt + rgb("#FCDCC7"))
      #v(2.5pt)
      #set text(size: tamano-caja-texto, fill: rgb("#263238"))
      #body
    ]
  )
  #v(3pt)
]

// ==============================================================================
// 3. CONTENIDO DEL DOCUMENTO
// ==============================================================================

#cabecera-editorial()

${bodyTypst.join('\n')}
`;
}
