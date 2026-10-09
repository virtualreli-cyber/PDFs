import type { Language, ApuntesMode } from '../types';

export interface ApuntesParsedData {
  curso: string;
  temaNum: string;
  titulo: string;
  subtitulo: string;
  bloques: string[];
  contentTypst: string;
}

export function generateApuntesTypst(markdown: string, mode: ApuntesMode, lang: Language): string {
  // Filtrar bloques según el modo
  let processedMd = markdown;
  if (mode === 'abreviado') {
    // Eliminar contenido marcado exclusivamente para la versión extendida
    processedMd = processedMd.replace(/<!--\s*solo-extendido\s*-->[\s\S]*?<!--\s*fin-extendido\s*-->/gi, '');
    processedMd = processedMd.replace(/:::extendido[\s\S]*?:::/gi, '');
  } else {
    // En versión extendida, quitar solo las marcas y dejar el contenido
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
  let quoteType = "EJEMPLO";
  let quoteTitle = "";
  let quoteAuthor = "";
  const quoteLines: string[] = [];

  function flushQuote() {
    if (!inQuote) return;
    const body = quoteLines.join(' ').trim().replace(/"/g, '\\"');
    bodyTypst.push(`caja-pastel("${quoteType}", "${quoteTitle.replace(/"/g, '\\"')}", [${body}], autor: "${quoteAuthor.replace(/"/g, '\\"')}")`);
    inQuote = false;
    quoteTitle = "";
    quoteAuthor = "";
    quoteLines.length = 0;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Metadatos explícitos
    if (line.startsWith('# TÍTULO:') || line.startsWith('# TITULO:')) {
      titulo = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }
    if (line.startsWith('# SUBTÍTULO:') || line.startsWith('# SUBTITULO:')) {
      subtitulo = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }
    if (line.startsWith('# CURSO:')) {
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

    // Cajas Didácticas
    if (line.startsWith('>')) {
      const quoteContent = line.substring(1).trim();

      // Detección de inicio de caja
      const boxMatch = quoteContent.match(/^\s*(?:📖|💡|📚|🏛️|🎨|👤|❓|🧭)?\s*\*\*\[?(CITA BÍBLICA|MAGISTERIO|EJEMPLO|GLOSARIO|DATO HISTÓRICO|ARTE Y SÍMBOLO|TESTIMONIO|¿SABÍAS QUE\.\.\.?\?|PARA PENSAR|CITA|EXEMPLE|GLOSSARI|DADA HISTÒRICA|ART I SÍMBOL|TESTIMONI|SABIES QUE|PER A PENSAR)\]?:?\*\*:?\s*(.*)/i);
      
      if (boxMatch) {
        flushQuote();
        inQuote = true;
        const tag = boxMatch[1].toUpperCase();
        quoteTitle = boxMatch[2].trim() || (isVa ? "Destacat" : "Destacado");

        if (tag.includes('CITA') || tag.includes('MAGISTERIO')) quoteType = 'CITA';
        else if (tag.includes('EJEMPLO') || tag.includes('EXEMPLE')) quoteType = 'EJEMPLO';
        else if (tag.includes('GLOSARIO') || tag.includes('GLOSSARI')) quoteType = 'GLOSARIO';
        else if (tag.includes('HISTÓRICO') || tag.includes('HISTÒRICA')) quoteType = 'HISTORICO';
        else if (tag.includes('ARTE') || tag.includes('ART')) quoteType = 'ARTE';
        else if (tag.includes('TESTIMONIO') || tag.includes('TESTIMONI')) quoteType = 'TESTIMONIO';
        else if (tag.includes('SABÍAS') || tag.includes('SABIES')) quoteType = 'SABIAS_QUE';
        else if (tag.includes('PENSAR')) quoteType = 'PARA_PENSAR';
        else quoteType = 'EJEMPLO';

        continue;
      }

      if (inQuote) {
        if (quoteContent.startsWith('—') || quoteContent.startsWith('- ')) {
          quoteAuthor = quoteContent.replace(/^[—-]\s*/, '').trim();
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
      bodyTypst.push(`bloque-banner("${bloqueMatch[1]}", "${bloqueMatch[2].replace(/"/g, '\\"')}")`);
      continue;
    }

    // Sección / Apartado
    const seccionMatch = line.match(/^###?\s*(\d+(?:\.\d+)?)\.?\s*(.+)/);
    if (seccionMatch) {
      bodyTypst.push(`seccion-header("${seccionMatch[1]}", "${seccionMatch[2].replace(/"/g, '\\"')}")`);
      continue;
    }

    // Encabezado nivel 3 genérico
    if (line.startsWith('###')) {
      const heading = line.replace(/^###\s*/, '').trim();
      bodyTypst.push(`seccion-header("", "${heading.replace(/"/g, '\\"')}")`);
      continue;
    }

    // Párrafos regulares y texto
    if (line) {
      // Formatear negritas y cursivas en Typst
      let typstParagraph = line
        .replace(/\*\*(.+?)\*\*/g, '#strong[$1]')
        .replace(/\*(.+?)\*/g, '#emph[$1]')
        .replace(/_(.+?)_/g, '#emph[$1]');
      
      bodyTypst.push(`\n${typstParagraph}\n`);
    }
  }

  flushQuote();

  const headerLabel = isVa ? "DOSSIER D'APUNTS" : "DOSSIER DE APUNTES";
  const headerVersion = mode === 'abreviado' ? (isVa ? " (VERSIÓ ABREUJADA)" : " (VERSIÓN ABREVIADA)") : "";
  const subtitleFinal = mode === 'abreviado' ? `${subtitulo} • ${isVa ? "Versió abreujada de repàs" : "Versión abreviada de repaso"}` : subtitulo;

  const bloquesGrid = bloques.length > 0 
    ? bloques.slice(0, 4).map(b => `box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${b}]]`).join(',\n      ')
    : `box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[BLOQUE 1: FUNDAMENTOS]],
       box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[BLOQUE 2: DESARROLLO]],
       box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[BLOQUE 3: APLICACIÓN]],
       box(fill: white, stroke: 0.5pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 3pt, y: 2.8pt), width: 100%)[#text(7pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[BLOQUE 4: COMPROMISO]]`;

  return `// ==============================================================================
// APUNTES OFICIALES • RELIGIÓN CATÓLICA
// Generado automáticamente con Sistema de Diseño Pastel (10.9pt Georgia)
// ==============================================================================

#set document(
  title: "${titulo.replace(/"/g, '\\"')}",
  author: "Departamento de Religión Católica"
)

#set page(
  paper: "a4",
  margin: (top: 1.45cm, bottom: 1.45cm, left: 1.55cm, right: 1.55cm),
  header: context {
    if counter(page).get().first() > 1 [
      #grid(
        columns: (1fr, auto),
        align: (left + bottom, right + bottom),
        text(7.8pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[${curso} • ${titulo.toUpperCase()}],
        text(7.8pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "bold")[${headerLabel}${headerVersion}]
      )
      #v(2pt)
      #line(length: 100%, stroke: 0.6pt + rgb("#CAD2C5"))
    ]
  },
  footer: context [
    #line(length: 100%, stroke: 0.6pt + rgb("#E0E7E3"))
    #v(3pt)
    #grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      text(7.2pt, fill: rgb("#52796F"), font: "Helvetica Neue")[${isVa ? "Departament de Religió Catòlica" : "Departamento de Religión Católica"} • ${headerLabel}],
      box(
        fill: rgb("#EDF4F2"),
        radius: 3pt,
        inset: (x: 6pt, y: 2.5pt),
        stroke: 0.5pt + rgb("#CAD2C5"),
        text(7.5pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[Página #counter(page).display("1 de 1", both: true)]
      )
    )
  ]
)

#set text(
  font: ("Georgia", "serif"),
  size: 10.9pt,
  fill: rgb("#263238"),
  lang: "${isVa ? 'ca' : 'es'}"
)

#set par(
  justify: true,
  leading: 0.54em,
  spacing: 0.95em
)

// MACROS VISUALES PASTEL
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
            text(7.5pt, fill: white, font: "Helvetica Neue", weight: "bold")[${curso}]
          )
          #v(3.5pt)
          #text(18pt, fill: rgb("#2F3E46"), font: "Helvetica Neue", weight: "bold")[${titulo}]
          #v(2.5pt)
          #text(9.5pt, fill: rgb("#52796F"), font: "Georgia", style: "italic")[${subtitleFinal}]
        ],
        [
          #box(
            fill: white,
            radius: 5pt,
            stroke: 1pt + rgb("#CAD2C5"),
            inset: (x: 9pt, y: 5.5pt),
            align(center)[
              #text(7pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[TEMA]\\
              #text(16.5pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "extrabold")[${temaNum}]\\
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
      text(8.2pt, fill: white, weight: "bold", font: "Helvetica Neue")[${isVa ? "BLOC" : "BLOQUE"} #num]
    ),
    text(10.2pt, fill: rgb("#2F3E46"), weight: "bold", font: "Helvetica Neue")[#title]
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
    box(
      fill: rgb("#EDF4F2"),
      radius: 3pt,
      inset: (x: 5.5pt, y: 2pt),
      stroke: 0.5pt + rgb("#CAD2C5"),
      text(8pt, fill: rgb("#52796F"), weight: "bold", font: "Helvetica Neue")[#num]
    ),
    text(9.7pt, fill: rgb("#2F3E46"), weight: "bold", font: "Helvetica Neue")[#title]
  )
  #v(2pt)
]

#let caja-pastel(tipo, titulo, cuerpo, autor: "") = [
  #v(4.5pt)
  #let (bg, border, accent, icon, lbl) = if tipo == "CITA" {
    (rgb("#F7F4FB"), rgb("#9B87C2"), rgb("#5E4B8B"), "📖", "${isVa ? "CITA BÍBLICA / MAGISTERI" : "CITA BÍBLICA / MAGISTERIO"}")
  } else if tipo == "PARA_PENSAR" {
    (rgb("#FFF6ED"), rgb("#F7C59F"), rgb("#B85D26"), "🧭", "${isVa ? "PER A PENSAR" : "PARA PENSAR"}")
  } else if tipo == "GLOSARIO" {
    (rgb("#F0F4F8"), rgb("#CAD2C5"), rgb("#52796F"), "📚", "${isVa ? "GLOSSARI CONCEPTUAL" : "GLOSARIO CONCEPTUAL"}")
  } else if tipo == "HISTORICO" {
    (rgb("#FEF9EE"), rgb("#EBD49D"), rgb("#8C6219"), "🏛️", "${isVa ? "UNA DADA HISTÒRICA" : "UN DATO HISTÓRICO"}")
  } else if tipo == "ARTE" {
    (rgb("#FDF2F4"), rgb("#E8B4B8"), rgb("#9C4149"), "🎨", "${isVa ? "ART I SÍMBOL" : "ARTE Y SÍMBOLO"}")
  } else if tipo == "TESTIMONIO" {
    (rgb("#F0F5FA"), rgb("#96BFDC"), rgb("#265B88"), "👤", "${isVa ? "UN TESTIMONI" : "UN TESTIMONIO"}")
  } else if tipo == "SABIAS_QUE" {
    (rgb("#F2FAF8"), rgb("#84C5B5"), rgb("#1D6B5A"), "❓", "${isVa ? "SABIES QUE...?" : "¿SABÍAS QUE...?"}")
  } else {
    (rgb("#F0F8F5"), rgb("#9BD1C2"), rgb("#287261"), "💡", "${isVa ? "EXEMPLE DEL DIA A DIA" : "EJEMPLO DEL DÍA A DÍA"}")
  }

  #block(
    width: 100%,
    fill: bg,
    stroke: (left: 3.5pt + accent, rest: 0.5pt + border),
    radius: (right: 4pt),
    inset: (x: 10pt, y: 6pt),
    breakable: false,
    [
      #text(7.8pt, fill: accent, weight: "bold", font: "Helvetica Neue")[#icon #lbl: #titulo]\\
      #v(2pt)
      #text(9.5pt, font: if tipo == "CITA" { "Georgia" } else { "Georgia" }, style: if tipo == "CITA" { "italic" } else { "normal" })[#cuerpo]
      #if autor != "" [
        #align(right)[#text(8pt, fill: accent, weight: "bold", font: "Helvetica Neue")[— #autor]]
      ]
    ]
  )
  #v(3pt)
]

// CONTENIDO PRINCIPAL
#cabecera-editorial()

${bodyTypst.join('\n')}
`;
}
