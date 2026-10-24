import type { Language, FontSizesConfig } from '../types';

export type TareaElemento =
  | { type: 'instrucciones'; texto: string }
  | { type: 'caja'; titulo: string; cuerpo: string; icono?: string; estilo?: string }
  | { type: 'pregunta'; num: number | string; texto: string; lineas: number }
  | { type: 'subseccion'; titulo: string }
  | { type: 'tabla'; headers: string[]; rows: string[][] }
  | { type: 'lista'; items: string[] }
  | { type: 'texto'; texto: string }
  | { type: 'pagebreak' };

export interface TareaActividad {
  num: number | string;
  titulo: string;
  sesion: string;
  tipo: string;
  unidad?: string;
  elementos: TareaElemento[];
}

function sanitizeForTypst(text: string): string {
  if (!text) return "";
  return text
    .replace(/"/g, '\\"')
    .replace(/<(?=[0-9a-zA-Z_%])/g, '\\<');
}

export interface TareasMetadata {
  curso: string;
  asignatura: string;
  tituloTema: string;
  subtituloTema: string;
  temaNumero: string;
}

export function extractTareasMetadata(markdown: string, isVa: boolean = false): TareasMetadata {
  let curso = isVa ? "2n ESO" : "2º ESO";
  let asignatura = isVa ? "RELIGIÓ CATÒLICA" : "RELIGIÓN CATÓLICA";
  let unidadDidactica = "";
  let tituloTema = "";
  let temaNumero = "";
  let subtituloTema = "";
  let inActUnidad = "";

  const lines = markdown.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Asignatura
    const asigMatch = line.match(/^#{1,3}\s*(?:ASIGNATURA|ASSIGNATURA|MATERIA|MATÈRIA):\s*(.*)/i);
    if (asigMatch && asigMatch[1].trim()) {
      asignatura = asigMatch[1].trim();
      continue;
    }

    // Curso
    const cursMatch = line.match(/^#{1,3}\s*(?:CURSO|CURS):\s*(.*)/i);
    if (cursMatch && cursMatch[1].trim()) {
      const rawCurso = cursMatch[1].trim();
      const parts = rawCurso.split(/[•·\-]/);
      curso = parts[0].trim();
      if (parts.length > 1 && /religi/i.test(parts[1])) {
        asignatura = parts[1].trim();
      }
      continue;
    }

    // Unidad Didáctica (prioridad principal)
    const udMatch = line.match(/^#{1,3}\s*(?:UNIDAD DID[AÁ]CTICA|UNITAT DID[AÀ]CTICA|UNIDAD|UNITAT|UD|UDI|UDII)(?:\s*\d+)?[:\.-]?\s*(.*)/i);
    if (udMatch && udMatch[1].trim()) {
      unidadDidactica = udMatch[1].trim();
      continue;
    }

    // Título explícito
    const titMatch = line.match(/^#{1,3}\s*(?:TÍTULO|TITULO|TÍTOL)(?:\s*DEL\s*TEMA)?[:\.-]?\s*(.*)/i);
    if (titMatch && titMatch[1].trim()) {
      tituloTema = titMatch[1].trim();
      continue;
    }

    // Subtítulo
    const subMatch = line.match(/^#{1,3}\s*(?:SUBTÍTULO|SUBTITULO|SUBTÍTOL)[:\.-]?\s*(.*)/i);
    if (subMatch && subMatch[1].trim()) {
      subtituloTema = subMatch[1].trim();
      continue;
    }

    // Tema
    const temaMatch = line.match(/^#{1,3}\s*(?:TEMA|TEMARI)(?:\s*\d+)?[:\.-]?\s*(.*)/i);
    if (temaMatch && temaMatch[1].trim()) {
      const val = temaMatch[1].trim();
      if (/^(?:Tema\s*)?\d+[a-zA-Z]?$/i.test(val)) {
        temaNumero = val;
      } else {
        const cleanVal = val.replace(/^(?:Tema\s*)?\d*[:\.-]?\s*/i, '').trim();
        if (cleanVal) {
          tituloTema = cleanVal;
        }
      }
      continue;
    }

    // Unidad dentro de actividad (- **Unidad:** ...)
    const actUnitMatch = line.match(/^-\s*\*{0,2}(?:Unidad|Unitat|Tema):\*{0,2}\s*(.*)/i);
    if (actUnitMatch && actUnitMatch[1].trim() && !inActUnidad) {
      inActUnidad = actUnitMatch[1].replace(/\*{0,2}/g, '').trim();
      continue;
    }
  }

  const effectiveTitle = unidadDidactica || tituloTema || inActUnidad || (isVa ? "HISTÒRIA DE L'ESGLÉSIA PRIMITIVA: MISSIÓ I TESTIMONI" : "HISTORIA DE LA IGLESIA PRIMITIVA: MISIÓN Y TESTIMONIO");

  return { curso, asignatura, tituloTema: effectiveTitle, subtituloTema, temaNumero };
}

export function parseTareasMarkdown(markdown: string, isVa: boolean = false) {
  const meta = extractTareasMetadata(markdown, isVa);
  let curso = meta.curso;
  let asignatura = meta.asignatura;
  let tituloTema = meta.tituloTema;
  const actividades: TareaActividad[] = [];

  const lines = markdown.split('\n');
  let currentAct: TareaActividad | null = null;
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Ignorar metadatos globales ya procesados en extractTareasMetadata
    if (line.match(/^#{1,3}\s*(?:ASIGNATURA|ASSIGNATURA|MATERIA|MATÈRIA|CURSO|CURS|TÍTULO|TITULO|TÍTOL|UNIDAD DID[AÁ]CTICA|UNITAT DID[AÀ]CTICA|UNIDAD|UNITAT|UD|UDI|UDII|TEMA|TEMARI|SUBTÍTULO|SUBTITULO|SUBTÍTOL|IDIOMA|LLENGUA|LENGUA|LANG|LANGUAGE)[:\.-]?/i)) {
      i++;
      continue;
    }

    // Detección de inicio de actividad / proyecto
    const isActLine = (line.startsWith('## ') || line.startsWith('# ACTIVIDAD') || line.startsWith('# ACTIVITAT') || line.startsWith('# PROYECTO') || line.startsWith('# PROJECTE') || line.startsWith('# PORTFOLIO') || line.startsWith('# TAREA') || line.startsWith('# TASCA'));

    if (isActLine) {
      const actMatch = line.match(/^#{1,2}\s*(?:ACTIVIDAD|ACTIVITAT|SESIÓN|SESSIÓ|PROYECTO|PROJECTE|PORTFOLIO|TAREA|TASCA|EXPEDIENTES)?(?:\s*DE\s*UNIDAD)?[:\.-]?\s*(?:(?:PORTFOLIO|PROYECTO|PROJECTE|SESIÓN|SESSIÓ|ACTIVIDAD|ACTIVITAT|TAREA|TASCA)\s*)?(\d+)?[:\s\.-]*(.*)/i);
      const actNum = actMatch && actMatch[1] ? actMatch[1] : `${actividades.length + 1}`;
      const actTitle = actMatch && actMatch[2]?.trim() ? actMatch[2].trim() : (isVa ? `Activitat ${actNum}` : `Actividad ${actNum}`);
      currentAct = {
        num: actNum,
        titulo: actTitle,
        sesion: "",
        tipo: "",
        unidad: "",
        elementos: []
      };
      actividades.push(currentAct);
      i++;
      continue;
    }

    if (currentAct) {
      // 1. Salto de página explícito
      if (line === '---' || line === '***' || line === '#pagebreak()' || line === '#pagebreak') {
        currentAct.elementos.push({ type: 'pagebreak' });
        i++;
        continue;
      }

      // 2. Metadatos de la actividad: Unidad (si se especifica explícitamente)
      if (/^-\s*\*{0,2}(?:Unidad|Unitat|Tema):\*{0,2}\s*(.*)/i.test(line)) {
        const uMatch = line.match(/^-\s*\*{0,2}(?:Unidad|Unitat|Tema):\*{0,2}\s*(.*)/i);
        if (uMatch && uMatch[1].trim()) {
          const uVal = uMatch[1].replace(/\*{0,2}/g, '').trim();
          currentAct.unidad = uVal;
        }
        i++;
        continue;
      }

      // 3. Metadato Criterios: ignorar
      if (/^-\s*\*{0,2}(?:Criterios|Criteris):\*{0,2}/i.test(line)) {
        i++;
        continue;
      }

      // 4. Instrucciones en formato metadato: "- Instrucciones: ..."
      if (/^-\s*\*{0,2}(?:Instrucciones|Instruccions):\*{0,2}/i.test(line)) {
        const text = line.substring(line.indexOf(':') + 1).replace(/\*{0,2}/g, '').trim();
        currentAct.elementos.push({ type: 'instrucciones', texto: text });
        i++;
        continue;
      }

      // 5. Metadatos de cabecera de la actividad:
      // Primer guion debajo de ACTIVIDAD -> Sesión (arriba a la derecha en azul)
      // Segundo guion debajo de ACTIVIDAD -> Tipo de actividad (abajo a la derecha en amarillo)
      const isExplicitSesion = /^-\s*\*{0,2}(?:Sesión|Sessió|Sesiones):\*{0,2}/i.test(line);
      const isExplicitTipo = /^-\s*\*{0,2}(?:Tipo|Tipus|Modalidad|Modalitat|Tarea de|Tasca de):\*{0,2}/i.test(line);

      if (isExplicitSesion || (currentAct.elementos.length === 0 && !currentAct.sesion && (line.startsWith('- ') || line.startsWith('* ')))) {
        const clean = line.replace(/^[-*]\s*/, '').replace(/\*{1,2}/g, '').trim();
        const colonIdx = clean.indexOf(':');
        if (colonIdx !== -1) {
          const label = clean.substring(0, colonIdx).trim();
          const val = clean.substring(colonIdx + 1).trim();
          currentAct.sesion = val ? `${label} ${val}` : label;
        } else {
          currentAct.sesion = clean;
        }
        i++;
        continue;
      }

      if (isExplicitTipo || (currentAct.elementos.length === 0 && !currentAct.tipo && (line.startsWith('- ') || line.startsWith('* ')))) {
        const clean = line.replace(/^[-*]\s*/, '').replace(/\*{1,2}/g, '').trim();
        const tipoMatch = clean.match(/^(?:Tipo(?:\s*de\s*(?:trabajo|tarea|activitat|actividad))?|Tipus(?:\s*de\s*(?:treball|tasca|activitat))?|Modalidad|Modalitat|Tarea de|Tasca de):\s*(.*)/i);
        const tipoText = tipoMatch && tipoMatch[1].trim() ? tipoMatch[1].trim() : clean;
        currentAct.tipo = tipoText;
        i++;
        continue;
      }

      // Bloque explícito de instrucciones: "### INSTRUCCIONES" / "### INSTRUCCIONS"
      if (/^#{3,4}\s*(?:INSTRUCCIONES|INSTRUCCIONS)\b/i.test(line)) {
        i++;
        const instLines: string[] = [];
        while (i < lines.length) {
          const l = lines[i].trim();
          if (!l) { i++; continue; }
          if (l.startsWith('###') || l.startsWith('##') || l.startsWith('#') || l === '---' || l.startsWith('>') || l.startsWith('|')) break;
          instLines.push(l);
          i++;
        }
        if (instLines.length > 0) {
          currentAct.elementos.push({ type: 'instrucciones', texto: instLines.join(' \\ \n') });
        }
        continue;
      }

      // Subsecciones / títulos intermedios: "### CUESTIONES A RESOLVER", "#### 1. Clasificación...", "### CASO PRÁCTICO"
      if (line.startsWith('### ') || line.startsWith('#### ')) {
        const titleText = line.replace(/^#+\s*/, '').trim();
        // Si el título es solo "CUESTIONES A RESOLVER", es un separador visual
        currentAct.elementos.push({ type: 'subseccion', titulo: titleText });
        i++;
        continue;
      }

      // Bloques de Citas / Cajas / Fuentes / Dilemas: líneas que empiezan por '>'
      if (line.startsWith('>')) {
        const cajaLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          cajaLines.push(lines[i].trim().replace(/^>\s*/, ''));
          i++;
        }

        if (cajaLines.length > 0) {
          const first = cajaLines[0];
          let titulo = isVa ? "DOCUMENT D'ANÀLISI" : "DOCUMENTO DE ANÁLISIS";
          let icono = "📜";
          let estilo = "fuente";

          const tagMatch = first.match(/^(?:([\p{Emoji}\u2000-\u3300])\s*)?\*{0,2}\[?(.*?)\]?\*{0,2}:?\s*(.*)/u);
          if (tagMatch && (first.includes('[') || first.includes('**'))) {
            if (tagMatch[1]) icono = tagMatch[1];
            const tagType = tagMatch[2]?.toUpperCase() || "";
            titulo = tagMatch[3]?.trim() || tagType || (isVa ? "DOCUMENT" : "DOCUMENTO");

            if (tagType.includes('DILEMA')) {
              icono = icono || "⚖️";
              estilo = "dilema";
            } else if (tagType.includes('CASO') || tagType.includes('CAS')) {
              icono = icono || "💡";
              estilo = "caso";
            } else if (tagType.includes('CONCEPTO') || tagType.includes('CONCEPTE') || tagType.includes('GLOSARIO') || tagType.includes('GLOSSARI')) {
              icono = icono || "📚";
              estilo = "concepto";
            } else if (tagType.includes('PRINCIPIO') || tagType.includes('PRINCIPI')) {
              icono = icono || "⚖️";
              estilo = "dilema";
            }
          } else if (first.startsWith('«') || first.startsWith('"')) {
            titulo = isVa ? "TEXT PER A COMENTAR" : "TEXTO PARA COMENTAR";
            icono = "📜";
            estilo = "fuente";
          }

          const cuerpoLines = tagMatch && (first.includes('[') || first.includes('**')) && tagMatch[3] ? cajaLines.slice(1) : cajaLines;
          const cuerpo = cuerpoLines.join(' ');
          currentAct.elementos.push({ type: 'caja', titulo, cuerpo: cuerpo || first, icono, estilo });
        }
        continue;
      }

      // Tablas Markdown: líneas que empiezan por '|'
      if (line.startsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const parseRow = (rowStr: string) =>
            rowStr.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

          const headers = parseRow(tableLines[0]);
          const dataRows: string[][] = [];
          for (let r = 1; r < tableLines.length; r++) {
            if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(tableLines[r])) continue;
            dataRows.push(parseRow(tableLines[r]));
          }

          if (headers.length > 0 && dataRows.length > 0) {
            currentAct.elementos.push({ type: 'tabla', headers, rows: dataRows });
          }
        }
        continue;
      }

      // Pregunta numerada: "1. Enunciado..."
      const qMatch = line.match(/^(\d+)[\.\)]\s*(.+)/);
      if (qMatch) {
        const qNum = parseInt(qMatch[1], 10);
        let qText = qMatch[2].trim();
        const isProject = currentAct.tipo.toLowerCase().includes('proy') || currentAct.tipo.toLowerCase().includes('projecte');
        let qLines = isProject ? 0 : 4;

        // Comprobar si hay pauta en la misma línea o en la siguiente
        const inlineLineMatch = qText.match(/\[(?:LÍNEAS|LINEAS|LÍNIES):\s*(\d+)\]/i);
        if (inlineLineMatch) {
          qLines = parseInt(inlineLineMatch[1], 10);
          qText = qText.replace(/\[(?:LÍNEAS|LINEAS|LÍNIES):\s*(\d+)\]/i, '').trim();
        } else if (i + 1 < lines.length) {
          const nextL = lines[i + 1].trim();
          const nextLineMatch = nextL.match(/^\[(?:LÍNEAS|LINEAS|LÍNIES):\s*(\d+)\]/i);
          if (nextLineMatch) {
            qLines = parseInt(nextLineMatch[1], 10);
            i++;
          }
        }

        currentAct.elementos.push({ type: 'pregunta', num: qNum, texto: qText, lineas: qLines });
        i++;
        continue;
      }

      // Listas de viñetas: "* **Situación A:** ..." o "- Caso 1: ..."
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('* ') || lines[i].trim().startsWith('- '))) {
          const it = lines[i].trim().replace(/^[\*\-]\s*/, '');
          if (!it.match(/^(?:Sesión|Sessió|Tipo|Tipus|Unidad|Unitat):/i)) {
            listItems.push(it);
          }
          i++;
        }
        if (listItems.length > 0) {
          currentAct.elementos.push({ type: 'lista', items: listItems });
        }
        continue;
      }

      // Pauta de líneas suelta: "[LÍNEAS: 4]"
      const standaloneLineMatch = line.match(/^\[(?:LÍNEAS|LINEAS|LÍNIES):\s*(\d+)\]/i);
      if (standaloneLineMatch) {
        const lastEl = currentAct.elementos[currentAct.elementos.length - 1];
        if (lastEl && lastEl.type === 'pregunta') {
          lastEl.lineas = parseInt(standaloneLineMatch[1], 10);
        }
        i++;
        continue;
      }

      // Párrafo de texto ordinario
      currentAct.elementos.push({ type: 'texto', texto: line });
      i++;
      continue;
    }

    i++;
  }

  return { curso, asignatura, tituloTema, actividades };
}

function renderTablaTypst(headers: string[], rows: string[][]): string {
  const colCount = Math.max(headers.length, ...rows.map(r => r.length));
  let colsStr = "1fr, ".repeat(colCount).slice(0, -2);
  if (colCount === 3) colsStr = "2.6fr, 1.15fr, 2.25fr";
  else if (colCount === 4) colsStr = "1.5fr, 1.2fr, 1.2fr, 1.2fr";
  else if (colCount === 2) colsStr = "1.2fr, 2fr";

  const headerCells = headers.map(h => {
    const cleanH = h.replace(/<br\s*\/?>/gi, ' \\ ');
    return `[#text(size: 9pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#2F3E46"))[${sanitizeForTypst(cleanH)}]]`;
  }).join(', ');

  const rowCells: string[] = [];
  for (const row of rows) {
    for (let c = 0; c < colCount; c++) {
      let cellText = (row[c] || "").replace(/<br\s*\/?>/gi, ' \\ ');
      const lineMatch = cellText.match(/\[(?:LÍNEAS|LINEAS|LÍNIES):\s*(\d+)\]/i);
      if (lineMatch) {
        rowCells.push(`pauta-celda(lineas: ${lineMatch[1]})`);
      } else if (cellText.includes('[ ]') || cellText.includes('[x]') || cellText.includes('[X]')) {
        const cleanBoxes = cellText
          .replace(/\[\s*\]/g, '#box(stroke: 0.6pt + rgb("#64748B"), width: 8.5pt, height: 8.5pt, radius: 1.5pt) ')
          .replace(/\[[xX]\]/g, '#box(fill: rgb("#52796F"), stroke: 0.6pt + rgb("#2F3E46"), width: 8.5pt, height: 8.5pt, radius: 1.5pt) ');
        rowCells.push(`[#text(size: 8.5pt)[${cleanBoxes}]]`);
      } else {
        rowCells.push(`[#text(size: 8.8pt)[${sanitizeForTypst(cellText)}]]`);
      }
    }
  }

  return `#table(
  columns: (${colsStr}),
  stroke: 0.5pt + rgb("#CAD2C5"),
  fill: (x, y) => if y == 0 { rgb("#EDF4F2") } else if calc.even(y) { rgb("#FAFBFB") } else { none },
  inset: (x: 5pt, y: 5pt),
  table.header(${headerCells}),
  ${rowCells.join(',\n  ')}
)`;
}

export function generateTareasTypst(
  markdown: string,
  lang: Language,
  fontSizes?: FontSizesConfig
): string {
  const titulos = fontSizes?.titulos ?? 12.5;
  const apartados = fontSizes?.apartados ?? 10.5;
  const contenido = fontSizes?.contenido ?? 10.8;

  const isVa = lang === 'va';
  const data = parseTareasMarkdown(markdown, isVa);

  const headerLeft = `${sanitizeForTypst(data.asignatura).toUpperCase()} • ${sanitizeForTypst(data.curso).toUpperCase()} • ${isVa ? "TASQUES" : "TAREAS"}`;
  const headerRight = sanitizeForTypst(data.tituloTema).toUpperCase();
  const deptText = isVa ? "Departament de Religió Catòlica" : "Departamento de Religión Católica";

  const actividadesPagesTypst = data.actividades.map((act) => {
    const renderedElements: string[] = [];

    // Renderizado estrictamente secuencial de los elementos según el orden en el texto
    for (const el of act.elementos) {
      if (el.type === 'instrucciones') {
        renderedElements.push(`  #caja-instrucciones[${sanitizeForTypst(el.texto)}]\n  #v(4pt)`);
      } else if (el.type === 'caja') {
        renderedElements.push(`  #caja-texto("${sanitizeForTypst(el.titulo)}", [${sanitizeForTypst(el.cuerpo)}], icono: "${el.icono || "📜"}", estilo: "${el.estilo || "fuente"}")\n  #v(4pt)`);
      } else if (el.type === 'subseccion') {
        renderedElements.push(`  #subseccion-titulo("${sanitizeForTypst(el.titulo)}")\n  #v(3pt)`);
      } else if (el.type === 'pregunta') {
        const pautaStr = el.lineas && el.lineas > 0 ? `\n  #v(2.5pt)\n  #pauta-lineas(${el.lineas})` : '';
        renderedElements.push(`  #seccion-pregunta("${el.num}", [${sanitizeForTypst(el.texto)}])${pautaStr}\n  #v(4pt)`);
      } else if (el.type === 'tabla') {
        renderedElements.push(`  ${renderTablaTypst(el.headers, el.rows)}\n  #v(4pt)`);
      } else if (el.type === 'lista') {
        const itemsCode = el.items.map(it => `    #list.item[#text(size: ${(contenido * 0.90).toFixed(1)}pt)[${sanitizeForTypst(it)}]]`).join('\n');
        renderedElements.push(`  #block(spacing: 3pt)[\n${itemsCode}\n  ]\n  #v(4pt)`);
      } else if (el.type === 'texto') {
        renderedElements.push(`  #text(size: ${(contenido * 0.95).toFixed(1)}pt)[${sanitizeForTypst(el.texto)}]\n  #v(3pt)`);
      } else if (el.type === 'pagebreak') {
        if (renderedElements.length > 0 && renderedElements[renderedElements.length - 1].trim() !== '#pagebreak()') {
          renderedElements.push(`  #pagebreak()`);
        }
      }
    }

    // Limpiar saltos de página redundantes al final de la actividad
    while (renderedElements.length > 0 && renderedElements[renderedElements.length - 1].trim() === '#pagebreak()') {
      renderedElements.pop();
    }

    return `
// PÁGINA ACTIVIDAD ${act.num}
#franja-alumno()
#banner-actividad("${act.num}", "${sanitizeForTypst(act.titulo)}", sesion: "${sanitizeForTypst(act.sesion)}", tipo: "${sanitizeForTypst(act.tipo)}")
#v(3pt)
${renderedElements.join('\n')}
#pagebreak()
`;
  }).join('\n');

  return `// ==============================================================================
// DOSSIER DE TAREAS Y ACTIVIDADES • RELIGIÓN CATÓLICA
// Sistema de Diseño Pastel (1 página por actividad + Rúbrica final, sin numeración)
// ==============================================================================

#set document(
  title: "${isVa ? "Tasques" : "Tareas"} - ${sanitizeForTypst(data.tituloTema)}",
  author: "${deptText}"
)

#set page(
  paper: "a4",
  margin: (top: 1.8cm, bottom: 1.8cm, left: 1.5cm, right: 1.5cm),
  header-ascent: 0.6cm,
  footer-descent: 0.6cm,
  header: context [
    #grid(
      columns: (auto, 1fr),
      gutter: 12pt,
      align: (left + bottom, right + bottom),
      text(8.5pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[${headerLeft}],
      align(right)[#text(8.5pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "bold")[${headerRight}]]
    )
    #v(3pt)
    #line(length: 100%, stroke: 0.6pt + rgb("#CAD2C5"))
  ],
  footer: context [
    #line(length: 100%, stroke: 0.6pt + rgb("#E0E7E3"))
    #v(4pt)
    #align(center)[
      #text(8.8pt, fill: rgb("#52796F"), font: "Helvetica Neue")[${deptText}]
    ]
  ]
)

#set text(
  font: ("Georgia", "Noto Serif CJK SC", "Noto Sans CJK SC", "serif"),
  size: ${contenido}pt,
  fill: rgb("#263238"),
  lang: "${isVa ? 'ca' : 'es'}"
)

#set par(justify: true, leading: 0.55em, spacing: 0.85em)

// COMPONENTES PASTEL
#let badge(texto, bg: rgb("#EDF4F2"), border: rgb("#84A98C"), color: rgb("#2F3E46")) = box(
  fill: bg,
  stroke: 0.5pt + border,
  radius: 3pt,
  inset: (x: 6pt, y: 2.5pt),
  baseline: 0%,
  text(size: 8pt, font: "Helvetica Neue", weight: "bold", fill: color)[#texto]
)

#let franja-alumno() = block(breakable: false, spacing: 6pt)[
  #grid(
    columns: (2.2fr, 1fr, 1.2fr),
    gutter: 10pt,
    [#text(size: 8.8pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#64748B"))[${isVa ? "Alumne/a:" : "Alumno/a:"}] #line(length: 100%, stroke: 0.4pt + rgb("#CAD2C5"))],
    [#text(size: 8.8pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#64748B"))[${isVa ? "Grup:" : "Grupo:"}] #line(length: 100%, stroke: 0.4pt + rgb("#CAD2C5"))],
    [#text(size: 8.8pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#64748B"))[${isVa ? "Data:" : "Fecha:"}] #line(length: 100%, stroke: 0.4pt + rgb("#CAD2C5"))]
  )
  #v(2pt)
]

#let banner-actividad(numero, titulo, sesion: "", tipo: "") = block(breakable: false, width: 100%, spacing: 8pt)[
  #rect(
    width: 100%,
    fill: rgb("#F0F4F8"),
    stroke: (left: 3.5pt + rgb("#52796F"), rest: 0.5pt + rgb("#CAD2C5")),
    radius: (right: 4pt),
    inset: (x: 11pt, top: 7pt, bottom: 7pt)
  )[
    #grid(
      columns: (1fr, auto),
      gutter: 10pt,
      align: (left + horizon, right + top),
      [
        #text(size: 9pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#52796F"))[${isVa ? "ACTIVITAT" : "ACTIVIDAD"} #numero]
        #v(1pt)
        #text(size: ${titulos}pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#2F3E46"))[#titulo]
      ],
      [
        #align(right + top)[
          #grid(
            rows: (auto, auto),
            gutter: 3pt,
            align: right,
            [
              #if sesion != "" [
                #badge(upper(sesion), bg: rgb("#E0E7FF"), border: rgb("#A5B4FC"), color: rgb("#3730A3"))
              ]
            ],
            [
              #if tipo != "" [
                #badge(upper(tipo), bg: rgb("#FEF3C7"), border: rgb("#FCD34D"), color: rgb("#92400E"))
              ]
            ]
          )
        ]
      ]
    )
  ]
]

#let pauta-lineas(n, espaciado: 15.0pt) = block(spacing: 5pt)[
  #for _ in range(n) [
    #v(espaciado)
    #line(length: 100%, stroke: (paint: rgb("#CBD5E1"), thickness: 0.6pt, dash: "dotted"))
  ]
]

#let pauta-celda(lineas: 2, espaciado: 10.5pt) = [
  #for _ in range(lineas) [
    #v(espaciado)
    #line(length: 100%, stroke: (paint: rgb("#CBD5E1"), thickness: 0.45pt, dash: "dotted"))
  ]
]

#let seccion-pregunta(num, enunciado) = block(breakable: false, spacing: 8pt)[
  #v(4pt)
  #grid(
    columns: (auto, 1fr),
    gutter: 6pt,
    box(fill: rgb("#EDF4F2"), stroke: 0.5pt + rgb("#84A98C"), radius: 3pt, inset: (x: 5pt, y: 2pt))[
      #text(size: 9pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#2F3E46"))[#num]
    ],
    text(size: ${apartados}pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#1E293B"))[#enunciado]
  )
]

#let subseccion-titulo(titulo) = block(breakable: false, spacing: 6pt)[
  #v(5pt)
  #text(size: 11pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#52796F"))[▶ #titulo]
  #v(2pt)
]

#let caja-instrucciones(cuerpo) = block(breakable: false, width: 100%, spacing: 8pt)[
  #rect(
    width: 100%,
    fill: rgb("#F8FAFC"),
    stroke: (left: 3pt + rgb("#94A3B8"), rest: 0.5pt + rgb("#E2E8F0")),
    radius: (right: 4pt),
    inset: (x: 10pt, y: 7pt)
  )[
    #text(size: 8.5pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#475569"))[📋 ${isVa ? "INSTRUCCIONS DE TREBALL:" : "INSTRUCCIONES DE TRABAJO:"}]\\
    #v(2pt)
    #text(size: ${(contenido * 0.91).toFixed(1)}pt, font: "Georgia", style: "italic", fill: rgb("#334155"))[#cuerpo]
  ]
]

#let caja-texto(titulo, cuerpo, icono: "📜", estilo: "fuente") = {
  let bg = rgb("#F8FAFC")
  let stroke-color = rgb("#52796F")
  let border-color = rgb("#CAD2C5")
  let text-color = rgb("#2F3E46")
  
  if estilo == "dilema" {
    bg = rgb("#FEF3C7")
    stroke-color = rgb("#D97706")
    border-color = rgb("#FDE68A")
    text-color = rgb("#92400E")
  } else if estilo == "caso" {
    bg = rgb("#EFF6FF")
    stroke-color = rgb("#2563EB")
    border-color = rgb("#BFDBFE")
    text-color = rgb("#1E40AF")
  } else if estilo == "concepto" {
    bg = rgb("#FAF5FF")
    stroke-color = rgb("#7C3AED")
    border-color = rgb("#DDD6FE")
    text-color = rgb("#6D28D9")
  }
  
  block(breakable: false, width: 100%, spacing: 8pt)[
    #rect(
      width: 100%,
      fill: bg,
      stroke: (left: 3.5pt + stroke-color, rest: 0.5pt + border-color),
      radius: (right: 4pt),
      inset: (x: 10pt, y: 7pt)
    )[
      #text(size: 9.5pt, font: "Helvetica Neue", weight: "bold", fill: text-color)[#icono #upper(titulo)] \\
      #v(3pt)
      #text(size: ${(contenido * 0.93).toFixed(1)}pt, font: "Georgia", style: "italic", fill: rgb("#1F2937"))[#cuerpo]
    ]
  ]
}

${actividadesPagesTypst}

// ==============================================================================
// PÁGINA FINAL: RÚBRICA Y AUTOEVALUACIÓN
// ==============================================================================
#franja-alumno()

#v(4pt)
#rect(
  width: 100%,
  fill: rgb("#EDF4F2"),
  stroke: (left: 3.5pt + rgb("#52796F"), rest: 0.5pt + rgb("#CAD2C5")),
  radius: (right: 4pt),
  inset: (x: 11pt, y: 7pt)
)[
  #text(size: 12.5pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#2F3E46"))[${isVa ? "RÚBRICA D'AUTOAVALUACIÓ I VALORACIÓ FINAL" : "RÚBRICA DE AUTOEVALUACIÓN Y VALORACIÓN FINAL"}]\\
  #v(1pt)
  #text(size: 9.2pt, font: "Helvetica Neue", fill: rgb("#52796F"))[${isVa ? "Valora el teu propi treball en el dossier (Nivells 1 a 4 punts per criteri)" : "Valora tu propio trabajo en el dossier (Niveles 1 a 4 puntos por criterio)"}]
]

#v(8pt)

#table(
  columns: (1.4fr, 1fr, 1fr, 1fr, 1fr),
  stroke: 0.5pt + rgb("#CBD5E1"),
  inset: 7pt,
  fill: (col, row) => if row == 0 { rgb("#F1F5F9") } else { none },
  align: (col, row) => if row == 0 { center + horizon } else { left + horizon },
  table.header(
    [*${isVa ? "Criteri d'Avaluació" : "Criterio de Evaluación"}*],
    [*${isVa ? "Nivell 1 (1 pto)" : "Nivel 1 (1 pto)"}*],
    [*${isVa ? "Nivell 2 (2 ptos)" : "Nivel 2 (2 ptos)"}*],
    [*${isVa ? "Nivell 3 (3 ptos)" : "Nivel 3 (3 ptos)"}*],
    [*${isVa ? "Nivell 4 (4 ptos)" : "Nivel 4 (4 ptos)"}*]
  ),
  [#text(size: 9.5pt, weight: "bold")[${isVa ? "1. Realització i lliurament" : "1. Realización y entrega"}]],
  [#text(size: 8.8pt)[${isVa ? "Incomplet (menys del 50%) o fora de termini." : "Incompleto (menos del 50%) o fuera de plazo."}]],
  [#text(size: 8.8pt)[${isVa ? "Completat al 60-70% amb omissions." : "Completado al 60-70% con omisiones."}]],
  [#text(size: 8.8pt)[${isVa ? "Quasi complet (80-90%) a temps." : "Casi completo (80-90%) a tiempo."}]],
  [#text(size: 8.8pt)[${isVa ? "100% complet, rigorós i puntual." : "100% completo, riguroso y puntual."}]],

  [#text(size: 9.5pt, weight: "bold")[${isVa ? "2. Profunditat explicativa" : "2. Profundidad explicativa"}]],
  [#text(size: 8.8pt)[${isVa ? "Respostes telegràfiques o superficials." : "Respuestas telegráficas o superficiales."}]],
  [#text(size: 8.8pt)[${isVa ? "Descripcions bàsiques sense aprofundir." : "Descripciones básicas sin profundizar."}]],
  [#text(size: 8.8pt)[${isVa ? "Bona argumentació i vocabulari adequat." : "Buena argumentación y vocabulario adecuado."}]],
  [#text(size: 8.8pt)[${isVa ? "Explicacions profundes, sòlides i precises." : "Explicaciones profundas, sólidas y precisas."}]],

  [#text(size: 9.5pt, weight: "bold")[${isVa ? "3. Ordre i presentació" : "3. Orden y presentación"}]],
  [#text(size: 8.8pt)[${isVa ? "Descuidat, tatxons o cal·ligrafia il·legible." : "Descuidado, tachones o caligrafía ilegible."}]],
  [#text(size: 8.8pt)[${isVa ? "Presentació millorable amb correccions." : "Presentación mejorable con correcciones."}]],
  [#text(size: 8.8pt)[${isVa ? "Neteja correcta i bona cal·ligrafia." : "Limpieza correcta y buena caligrafía."}]],
  [#text(size: 8.8pt)[${isVa ? "Impecable, polit i excel·lent ortografia." : "Impecable, pulcro y excelente ortografía."}]]
)

#v(10pt)

#rect(
  width: 100%,
  stroke: 0.8pt + rgb("#CBD5E1"),
  radius: 4pt,
  fill: rgb("#F8FAFC"),
  inset: (x: 12pt, y: 10pt)
)[
  #grid(
    columns: (1fr, auto),
    text(size: 11.2pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#1E293B"))[${isVa ? "REFLEXIÓ PERSONAL D'APRENENTATGE" : "REFLEXIÓN PERSONAL DE APRENDIZAJE"}],
    box(fill: rgb("#EFF6FF"), stroke: 0.6pt + rgb("#93C5FD"), inset: (x: 8pt, y: 3pt), radius: 3pt)[
      #text(size: 9pt, weight: "bold", fill: rgb("#1E40AF"))[${isVa ? "PUNTUACIÓ TOTAL: [       ] / 12" : "PUNTUACIÓN TOTAL: [       ] / 12"}]
    ]
  )
  #v(8pt)
  #text(size: 9.8pt, weight: "bold", fill: rgb("#475569"))[${isVa ? "1. Quin concepte o ensenyament t'ha resultat més significatiu d'este tema i per què?" : "1. ¿Qué concepto o enseñanza te ha resultado más significativo de este tema y por qué?"}]
  #pauta-lineas(3)
  #v(8pt)
  #text(size: 9.8pt, weight: "bold", fill: rgb("#475569"))[${isVa ? "2. En quin aspecte concret pots millorar el teu treball per a la pròxima unitat?" : "2. ¿En qué aspecto concreto puedes mejorar tu trabajo para la próxima unidad?"}]
  #pauta-lineas(3)
]
`;
}
