import type { Language, ApuntesMode, FontSizesConfig } from '../types';

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

function formatInline(text: string): string {
  if (!text) return "";
  let res = text;
  // Escapar almohadillas literales para que no se interpreten como código Typst
  res = res.replace(/#/g, '\\#');
  // Código entre backticks: `code`
  res = res.replace(/`([^`\n]+?)`/g, '#raw("$1")');
  // Negrita: **texto** o __texto__
  res = res.replace(/\*\*([^*\n]+?)\*\*/g, '#strong[$1]');
  res = res.replace(/__([^_\n]+?)__/g, '#strong[$1]');
  // Cursiva: *texto* o _texto_
  res = res.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '#emph[$1]');
  res = res.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '#emph[$1]');
  // Escapar etiquetas Typst accidentales: <alfa>
  res = res.replace(/<(?=[0-9a-zA-Z_%])/g, '\\<');
  return res;
}

export function generateApuntesTypst(
  markdown: string,
  mode: ApuntesMode,
  lang: Language,
  fontSizes?: FontSizesConfig
): string {
  const titulos = fontSizes?.titulos ?? 16.5;
  const apartados = fontSizes?.apartados ?? 11.4;
  const contenido = fontSizes?.contenido ?? 10.9;

  // Filtrar bloques según el modo (extendido vs abreviado)
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
    const formattedLines = quoteLines.map(l => formatInline(l));
    const safeBody = formattedLines.join('\n\n').trim();
    const safeTitle = sanitizeTypst(quoteTitle);
    const safeAuthor = sanitizeTypst(quoteAuthor);

    if (quoteType === 'CITA') {
      const authorArg = safeAuthor ? `"${safeAuthor}"` : 'none';
      const titleArg = safeTitle ? `"${safeTitle}"` : 'none';
      bodyTypst.push(`#caja-cita([${safeBody}], titulo: ${titleArg}, autor: ${authorArg})`);
    } else if (quoteType === 'EJEMPLO') {
      const titleArg = safeTitle ? `"${safeTitle}"` : 'none';
      bodyTypst.push(`#caja-ejemplo(titulo: ${titleArg}, [${safeBody}])`);
    } else if (quoteType === 'GLOSARIO') {
      const hasBullets = rawBody.includes('•') || rawBody.includes('- ');
      if (hasBullets) {
        bodyTypst.push(`#caja-glosario([${safeBody}])`);
      } else {
        const term = safeTitle || (isVa ? 'Concepte clau' : 'Concepto clave');
        bodyTypst.push(`#caja-glosario([#text(tamano-caja-texto, fill: rgb("#2D4B73"), weight: "bold", font: "Helvetica Neue")[• ${term}]\\ \n#v(1.5pt)\n${safeBody}])`);
      }
    } else if (quoteType === 'HISTORICO') {
      const titleArg = safeTitle ? `"${safeTitle}"` : 'none';
      bodyTypst.push(`#caja-dato-historico(titulo: ${titleArg}, [${safeBody}])`);
    } else if (quoteType === 'ARTE') {
      const titleArg = safeTitle ? `"${safeTitle}"` : 'none';
      bodyTypst.push(`#caja-arte-simbolo(titulo: ${titleArg}, [${safeBody}])`);
    } else if (quoteType === 'TESTIMONIO') {
      const titleArg = safeTitle ? `"${safeTitle}"` : 'none';
      const personArg = safeAuthor ? `"${safeAuthor}"` : 'none';
      bodyTypst.push(`#caja-testimonio(titulo: ${titleArg}, persona: ${personArg}, [${safeBody}])`);
    } else if (quoteType === 'SABIAS_QUE') {
      const titleArg = safeTitle ? `"${safeTitle}"` : 'none';
      bodyTypst.push(`#caja-sabias-que(titulo: ${titleArg}, [${safeBody}])`);
    } else if (quoteType === 'PARA_PENSAR') {
      const titleArg = safeTitle ? `"${safeTitle}"` : 'none';
      bodyTypst.push(`#caja-para-pensar([${safeBody}], titulo: ${titleArg})`);
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
    if (line.startsWith('# IDIOMA:') || line.startsWith('# LLENGUA:') || line.startsWith('# LENGUA:') || line.startsWith('# LANG:') || line.startsWith('# LANGUAGE:')) {
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

    // Bloques en metadatos de cabecera
    const blocMatch = line.match(/^-\s*\*\*(Bloque\s*\d+|Bloc\s*\d+):?\*\*:?\s*(.+)/i);
    if (blocMatch) {
      const bName = blocMatch[1].replace(/:$/, "").trim().toUpperCase();
      bloques.push(`${bName}: ${blocMatch[2].trim()}`);
      continue;
    }

    // Cajas Didácticas (comienzan con '>')
    if (line.startsWith('>')) {
      const quoteContent = line.substring(1).trim();
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
        if (/^[—–-]{1,2}\s*/.test(quoteContent)) {
          quoteAuthor = quoteContent.replace(/^[—–-]+\s*/, '').trim();
        } else {
          quoteLines.push(quoteContent);
        }
        continue;
      } else {
        inQuote = true;
        quoteType = 'CITA';
        quoteTitle = '';
        if (/^[—–-]{1,2}\s*/.test(quoteContent)) {
          quoteAuthor = quoteContent.replace(/^[—–-]+\s*/, '').trim();
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

    // Separador o salto de página explícito
    if (line === '---' || line === '***') {
      bodyTypst.push('#pagebreak()');
      continue;
    }

    // Banner de Bloque temático
    const bloqueMatch = line.match(/^#\s*(?:BLOQUE|BLOC)\s*(\d+)[:\.]?\s*(.+)/i);
    if (bloqueMatch) {
      bodyTypst.push(`\n#bloque-banner("${bloqueMatch[1]}", "${sanitizeTypst(bloqueMatch[2])}")\n`);
      continue;
    }

    // Sección / Apartado numerado (1.1, 1.2, etc.)
    const seccionMatch = line.match(/^###?\s*(\d+(?:\.\d+)?)\.?\s*(.+)/);
    if (seccionMatch) {
      bodyTypst.push(`\n#seccion-header("${seccionMatch[1]}", "${sanitizeTypst(seccionMatch[2])}")\n`);
      continue;
    }

    // Encabezado nivel 4 o superior (#### ...)
    if (line.startsWith('####')) {
      const heading = line.replace(/^#+\s*/, '').trim();
      bodyTypst.push(`\n#v(4pt)\n#text(size: ${(apartados * 0.95).toFixed(1)}pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#2F3E46"))[${formatInline(heading)}]\n#v(2pt)\n`);
      continue;
    }

    // Encabezado nivel 3 genérico
    if (line.startsWith('###')) {
      const heading = line.replace(/^###\s*/, '').trim();
      bodyTypst.push(`\n#seccion-header("", "${sanitizeTypst(heading)}")\n`);
      continue;
    }

    // Encabezado nivel 2 genérico (## ...)
    if (line.startsWith('##')) {
      const heading = line.replace(/^##\s*/, '').trim();
      bodyTypst.push(`\n#seccion-header("", "${sanitizeTypst(heading)}")\n`);
      continue;
    }

    // Encabezado nivel 1 genérico (# ...)
    if (line.startsWith('#')) {
      const heading = line.replace(/^#\s*/, '').trim();
      if (/^(?:ACTIVIDAD|ACTIVITAT|PROYECTO|PROJECTE|TAREA|TASCA)/i.test(heading)) {
        bodyTypst.push(`\n#v(6pt)\n#block(
  width: 100%,
  fill: rgb("#F0F4F8"),
  stroke: (left: 3.5pt + rgb("#52796F"), rest: 0.5pt + rgb("#CAD2C5")),
  radius: (right: 4pt),
  inset: (x: 10pt, y: 6pt)
)[#text(size: ${(apartados * 1.05).toFixed(1)}pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#2F3E46"))[${formatInline(heading)}]]\n#v(4pt)\n`);
      } else {
        bodyTypst.push(`\n#seccion-header("", "${sanitizeTypst(heading)}")\n`);
      }
      continue;
    }

    // Tablas Markdown
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--;

      const rows: string[][] = [];
      for (const tLine of tableLines) {
        if (/^\|[\s\-:|]+\|$/.test(tLine)) continue;
        const cells = tLine.split('|').slice(1, -1).map(c => c.trim());
        if (cells.length > 0) rows.push(cells);
      }

      if (rows.length > 0) {
        const header = rows[0];
        const bodyRows = rows.slice(1);
        const colCount = Math.max(header.length, ...bodyRows.map(r => r.length));
        let colsStr = "1fr, ".repeat(colCount).slice(0, -2);
        if (colCount === 3) colsStr = "2fr, 1.2fr, 2.2fr";
        else if (colCount === 4) colsStr = "1.5fr, 1.2fr, 1.2fr, 1.2fr";

        const headerCells = header.map(h => {
          const cleanH = formatInline(h.replace(/<br\s*\/?>/gi, ' \\ '));
          return `[#text(size: 8.8pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#2F3E46"))[${cleanH}]]`;
        }).join(', ');

        const rowCells: string[] = [];
        for (const row of bodyRows) {
          for (let c = 0; c < colCount; c++) {
            const rawCell = (row[c] || "").replace(/<br\s*\/?>/gi, ' \\ ');
            rowCells.push(`[#text(size: 8.5pt)[${formatInline(rawCell)}]]`);
          }
        }

        bodyTypst.push(`\n#v(4pt)\n#table(
  columns: (${colsStr}),
  stroke: 0.5pt + rgb("#CAD2C5"),
  fill: (x, y) => if y == 0 { rgb("#EDF4F2") } else if calc.even(y) { rgb("#FAFBFB") } else { none },
  inset: (x: 5pt, y: 5pt),
  table.header(${headerCells}),
  ${rowCells.join(',\n  ')}
)\n#v(4pt)\n`);
      }
      continue;
    }

    // Listas con viñetas o numeración (soporte anidado)
    const listMatch = rawLine.match(/^(\s*)([*+-]|\d+\.|•)\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1];
      const marker = listMatch[2];
      const itemContent = formatInline(listMatch[3].trim());
      if (/^\d+\./.test(marker)) {
        bodyTypst.push(`${indent}+ ${itemContent}`);
      } else {
        bodyTypst.push(`${indent}- ${itemContent}`);
      }
      continue;
    }

    // Párrafos regulares y texto en prosa
    if (line) {
      const typstParagraph = formatInline(line);
      bodyTypst.push(`\n${typstParagraph}\n`);
    }
  }

  flushQuote();

  const headerLabel = isVa ? "DOSSIER D'APUNTS" : "DOSSIER DE APUNTES";
  const headerVersion = mode === 'abreviado' ? (isVa ? " (VERSIÓ ABREUJADA)" : " (VERSIÓN ABREVIADA)") : "";
  const subtitleFinal = mode === 'abreviado' ? `${subtitulo} • ${isVa ? "Versió abreujada de repàs" : "Versión abreviada de repaso"}` : subtitulo;

  const bloquesGrid = bloques.length > 0 
    ? bloques.slice(0, 4).map(b => `box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 3.2pt), width: 100%)[#align(center)[#text(6.8pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(b)}]]]`).join(',\n      ')
    : `box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 3.2pt), width: 100%)[#align(center)[#text(6.8pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${isVa ? "BLOC 1: FONAMENTS" : "BLOQUE 1: FUNDAMENTOS"}]]],
       box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 3.2pt), width: 100%)[#align(center)[#text(6.8pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${isVa ? "BLOC 2: DESENVOLUPAMENT" : "BLOQUE 2: DESARROLLO"}]]],
       box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 3.2pt), width: 100%)[#align(center)[#text(6.8pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${isVa ? "BLOC 3: APLICACIÓ" : "BLOQUE 3: APLICACIÓN"}]]],
       box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 3.2pt), width: 100%)[#align(center)[#text(6.8pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${isVa ? "BLOC 4: COMPROMÍS" : "BLOQUE 4: COMPROMISO"}]]]`;

  return `// ==============================================================================
// APUNTES OFICIALES • RELIGIÓN CATÓLICA
// Generado automáticamente con Sistema de Diseño Pastel (Georgia ${contenido}pt)
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
  font: ("Georgia", "Noto Serif CJK SC", "Noto Sans CJK SC", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", "serif"),
  size: ${contenido}pt,
  fill: rgb("#263238"),
  lang: "${isVa ? 'ca' : 'es'}"
)

#set par(
  justify: true,
  leading: 0.54em,
  spacing: 0.95em
)

#let tamano-caja-texto = ${(contenido * 0.94).toFixed(1)}pt

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
        gutter: 18pt,
        align: (left + horizon, right + horizon),
        [
          #box(
            fill: rgb("#52796F"),
            radius: 3pt,
            inset: (x: 6pt, y: 3pt),
            text(7.5pt, fill: white, font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(curso)}]
          )
          #v(3.5pt)
          #block(width: 100%)[
            #text(${titulos}pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(titulo).replace(/\\\\/g, '\\\n')}]
          ]
          #v(2.5pt)
          #text(${(titulos * 0.58).toFixed(1)}pt, fill: rgb("#52796F"), font: "Georgia", style: "italic")[${sanitizeTypst(subtitleFinal)}]
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
        align: center + horizon,
        ${bloquesGrid}
      )
    ]
  )
  #v(5pt)
]

#let bloque-banner(num, title) = block(breakable: false)[
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
    text(${(apartados + 0.4).toFixed(1)}pt, fill: rgb("#2F3E46"), weight: "bold", font: "Helvetica Neue")[#title]
  )
  #v(2.5pt)
  #line(length: 100%, stroke: 1pt + rgb("#84A98C"))
  #v(3pt)
]

#let seccion-header(num, title) = block(breakable: false)[
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
    text(${apartados}pt, fill: rgb("#2F3E46"), weight: "bold", font: "Helvetica Neue")[#title]
  )
  #v(2pt)
]

// ==============================================================================
// 2. CATÁLOGO DIDÁCTICO PASTEL (8 CAJAS NORMALIZADAS CON ICONOGRAFÍA VECTORIAL)
// ==============================================================================

// 1. Cita Bíblica / Magisterio (Tono Lavanda)
#let caja-cita(cita, titulo: none, autor: none, exegesis: none) = [
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
        text(8.5pt, fill: rgb("#5E4B8B"), weight: "bold", font: "Helvetica Neue")[
          ${isVa ? "CITA BÍBLICA / MAGISTERI" : "CITA BÍBLICA / MAGISTERIO"}#if titulo != none [ • #titulo]
        ]
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
#let caja-ejemplo(titulo: none, body) = [
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
        text(8.5pt, fill: rgb("#287261"), weight: "bold", font: "Helvetica Neue")[
          ${isVa ? "EXEMPLE DEL DIA A DIA" : "EJEMPLO DEL DÍA A DÍA"}#if titulo != none [ • #titulo]
        ]
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
#let caja-glosario(body) = [
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
      #v(2.5pt)
      #set text(size: tamano-caja-texto, fill: rgb("#263238"))
      #body
    ]
  )
  #v(3pt)
]

// 4. Un Dato Histórico (Tono Vainilla)
#let caja-dato-historico(titulo: none, body) = [
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
        text(8.5pt, fill: rgb("#8C6219"), weight: "bold", font: "Helvetica Neue")[
          ${isVa ? "UNA DADA HISTÒRICA" : "UN DATO HISTÓRICO"}#if titulo != none [ • #titulo]
        ]
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
#let caja-arte-simbolo(titulo: none, body) = [
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
        text(8.5pt, fill: rgb("#9C414D"), weight: "bold", font: "Helvetica Neue")[
          ${isVa ? "ART I SÍMBOL" : "ARTE Y SÍMBOLO"}#if titulo != none [ • #titulo]
        ]
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
#let caja-testimonio(titulo: none, persona: none, body) = [
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
        text(8.5pt, fill: rgb("#265B88"), weight: "bold", font: "Helvetica Neue")[
          ${isVa ? "UN TESTIMONI" : "UN TESTIMONIO"}#if titulo != none [ • #titulo]
        ]
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
#let caja-sabias-que(titulo: none, body) = [
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
        text(8.5pt, fill: rgb("#1D6B5A"), weight: "bold", font: "Helvetica Neue")[
          ${isVa ? "SABIES QUE...?" : "¿SABÍAS QUE...?"}#if titulo != none [ • #titulo]
        ]
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
#let caja-para-pensar(body, titulo: none) = [
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
        text(8.5pt, fill: rgb("#B85D26"), weight: "bold", font: "Helvetica Neue")[
          ${isVa ? "PER A PENSAR • DIÀLEG I REFLEXIÓ" : "PARA PENSAR • DIÁLOGO Y REFLEXIÓN"}#if titulo != none [ • #titulo]
        ]
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
