import type { Language, ExamenTipo, ExamenDocType } from '../types';

export interface PreguntaTest {
  num: number;
  enunciado: string;
  opciones: { letra: string; texto: string; correcta: boolean }[];
}

export interface PreguntaDesarrollo {
  num: number;
  puntos: string;
  enunciado: string;
  pautas: string;
  citaTexto?: string;
  lineas: number;
}

export type ExamenElement =
  | { type: 'test'; q: PreguntaTest }
  | { type: 'desarrollo'; q: PreguntaDesarrollo }
  | { type: 'banner'; titulo: string; desc?: string }
  | { type: 'cita'; texto: string }
  | { type: 'pagebreak' };

function sanitizeTypst(text: string): string {
  if (!text) return "";
  return text
    .replace(/"/g, '\\"')
    .replace(/<(?=[0-9a-zA-Z_%])/g, '\\<');
}

export function parseExamenMarkdown(markdown: string) {
  let titulo = "EXAMEN";
  let subtitulo = "Tema [XX]: [Título de la Unidad]";
  let curso = "2º ESO";
  let instrucciones = "";
  const elementos: ExamenElement[] = [];
  const preguntasTest: PreguntaTest[] = [];
  const preguntasDesarrollo: PreguntaDesarrollo[] = [];

  const lines = markdown.split('\n');
  let currentTest: PreguntaTest | null = null;
  let currentDes: PreguntaDesarrollo | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

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
    if (line.startsWith('# INSTRUCCIONES:') || line.startsWith('# INSTRUCCIONS:')) {
      instrucciones = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }

    // Salto de página explícito
    if (line === '---' || line === '***') {
      currentTest = null;
      currentDes = null;
      elementos.push({ type: 'pagebreak' });
      continue;
    }

    // Banners de parte o sección
    if (line.startsWith('## ')) {
      currentTest = null;
      currentDes = null;
      const bannerText = line.substring(3).trim();
      // Si la siguiente línea es descripción
      let desc = '';
      if (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].trim().startsWith('#') && !lines[i + 1].trim().match(/^\d+[\.\)]/)) {
        desc = lines[i + 1].trim();
        i++;
      }
      elementos.push({ type: 'banner', titulo: bannerText, desc });
      continue;
    }

    // Cita textual
    if (line.startsWith('> «') || line.startsWith('> "') || line.startsWith('> 📖') || line.startsWith('> 📜')) {
      const cita = line.replace(/^>\s*/, '').trim();
      if (currentDes) {
        currentDes.citaTexto = cita;
      } else {
        elementos.push({ type: 'cita', texto: cita });
      }
      continue;
    }

    // Pautas para desarrollo
    if (line.startsWith('- Pautas:') || line.startsWith('- Pautes:')) {
      if (currentDes) {
        currentDes.pautas = line.substring(line.indexOf(':') + 1).trim();
      }
      continue;
    }

    // Líneas para desarrollo
    if (line.startsWith('- Líneas:') || line.startsWith('- Línies:') || line.startsWith('[LÍNEAS:') || line.startsWith('[LÍNIES:') || line.startsWith('[LINEAS:')) {
      const numM = line.match(/\d+/);
      if (numM && currentDes) {
        currentDes.lineas = parseInt(numM[0], 10);
      }
      continue;
    }

    // Pregunta con formato de desarrollo: e.g. "1. [2,0 ptos] Enunciado..."
    const desMatch = line.match(/^(\d+)[\.\)]\s*\[(.*?)\]\s*(.+)/);
    if (desMatch) {
      currentTest = null;
      currentDes = {
        num: parseInt(desMatch[1], 10),
        puntos: desMatch[2].trim(),
        enunciado: desMatch[3].trim(),
        pautas: "",
        lineas: 6
      };
      preguntasDesarrollo.push(currentDes);
      elementos.push({ type: 'desarrollo', q: currentDes });
      continue;
    }

    // Opción de test: e.g. "*a) Opción", "b) Opción", "a. Opción"
    const optMatch = line.match(/^(\*?)\(?([a-dA-D])\)[\.\s]\s*(.+)/);
    if (optMatch && currentTest) {
      const isCorrecta = optMatch[1] === '*' || line.includes('[CORRECTA]') || line.includes('[X]');
      const letra = optMatch[2].toLowerCase();
      const texto = optMatch[3].replace(/\[CORRECTA\]/i, '').replace(/\[X\]/i, '').trim();
      currentTest.opciones.push({
        letra,
        texto,
        correcta: isCorrecta
      });
      continue;
    }

    // Pregunta genérica: puede ser test o desarrollo
    const qMatch = line.match(/^(\d+)[\.\)]\s*(.+)/);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      const qText = qMatch[2].trim();

      // Mirar hacia adelante para saber si es test o desarrollo
      let looksLikeTest = false;
      for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;
        if (nextLine.match(/^\(?\*?[a-dA-D]\)[\.\s]/)) {
          looksLikeTest = true;
          break;
        }
        if (nextLine.startsWith('- Pautas:') || nextLine.startsWith('- Líneas:') || nextLine.startsWith('[LÍNEAS:')) {
          looksLikeTest = false;
          break;
        }
        if (nextLine.match(/^\d+[\.\)]/)) break;
      }

      if (looksLikeTest) {
        currentDes = null;
        currentTest = {
          num: qNum,
          enunciado: qText,
          opciones: []
        };
        preguntasTest.push(currentTest);
        elementos.push({ type: 'test', q: currentTest });
      } else {
        currentTest = null;
        currentDes = {
          num: qNum,
          puntos: "2,0 ptos",
          enunciado: qText,
          pautas: "",
          lineas: 6
        };
        preguntasDesarrollo.push(currentDes);
        elementos.push({ type: 'desarrollo', q: currentDes });
      }
      continue;
    }
  }

  // Asegurar que cada pregunta test tenga al menos una opción correcta marcada
  for (const q of preguntasTest) {
    if (!q.opciones.some(o => o.correcta) && q.opciones.length > 0) {
      q.opciones[0].correcta = true;
    }
  }

  return { titulo, subtitulo, curso, instrucciones, elementos, preguntasTest, preguntasDesarrollo };
}

export function generateExamenTypst(
  markdown: string,
  tipo: ExamenTipo,
  docType: ExamenDocType,
  lang: Language
): string {
  const isVa = lang === 'va';
  const data = parseExamenMarkdown(markdown);

  if (docType === 'solucionario') {
    return generateSolucionarioTypst(data, tipo, isVa);
  }

  return generateExamenCompletoTypst(data, tipo, isVa);
}

// -------------------------------------------------------------
// 1. GENERADOR PRINCIPAL DE EXAMEN (FLUJO CONTINUO Y FLEXIBLE)
// -------------------------------------------------------------
function generateExamenCompletoTypst(data: ReturnType<typeof parseExamenMarkdown>, tipo: ExamenTipo, isVa: boolean): string {
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÒLICA";
  const numTest = data.preguntasTest.length;

  // Instrucciones editables / heredadas del Markdown
  let cleanInst = data.instrucciones.replace(/^(?:INSTRUCCIONES|INSTRUCCIONS):\s*/i, '');
  if (!cleanInst) {
    if (tipo === 'test') {
      const ptos = numTest > 0 ? (10 / numTest).toFixed(2).replace('.', ',') : '0,50';
      cleanInst = isVa
        ? `Llig atentament cada qüestió. Marca amb una creu o cercle l'opció correcta per a cada enunciat. Cada encert suma ${ptos} punts. Les respostes incorrectes no penalitzen.`
        : `Lee atentamente cada cuestión. Marca con una cruz o círculo claro la opción correcta para cada enunciado. Calificación: 10 puntos (${ptos} puntos por acierto). Respuestas incorrectas no restan.`;
    } else if (tipo === 'mixto') {
      cleanInst = isVa
        ? `PARTE I (Test): Respon a les preguntes d'opció múltiple. PARTE II (Desenvolupament): Respon amb claredat, rigor teològic i vocabulari precís en l'espai pautat.`
        : `PARTE I (Test): Responde a las preguntas de opción múltiple. PARTE II (Desarrollo): Responde con claridad, rigor teológico y vocabulario preciso en el espacio pautado.`;
    } else {
      cleanInst = isVa
        ? `Respon de manera raonada a cadascuna de les qüestions en l'espai pautat. Es valorarà la claredat expositiva, la maduresa ètica i el rigor teològic.`
        : `Responde de manera razonada a cada una de las cuestiones en el espacio pautado. Se valorará la claridad expositiva, la madurez ética y el rigor conceptual.`;
    }
  }

  // Renderizador de preguntas tipo test
  function renderPreguntaTest(q: PreguntaTest) {
    const a = q.opciones.find(o => o.letra === 'a')?.texto || '';
    const b = q.opciones.find(o => o.letra === 'b')?.texto || '';
    const c = q.opciones.find(o => o.letra === 'c')?.texto || '';
    const d = q.opciones.find(o => o.letra === 'd')?.texto || '';
    return `#pregunta-test("${q.num}", "${sanitizeTypst(q.enunciado)}", "${sanitizeTypst(a)}", "${sanitizeTypst(b)}", "${sanitizeTypst(c)}", "${sanitizeTypst(d)}")`;
  }

  // Renderizador de preguntas de desarrollo
  function renderPreguntaDesarrollo(d: PreguntaDesarrollo) {
    const citaBlock = d.citaTexto ? `\n  #caja-cita-examen("${sanitizeTypst(d.citaTexto)}")` : '';
    const pautasBlock = d.pautas ? `\n  #v(2.5pt)\n  #text(size: 9.5pt, style: "italic", fill: rgb("#64748B"))[${isVa ? "Pautes" : "Pautas"}: ${sanitizeTypst(d.pautas)}]` : '';
    return `#block(breakable: false, spacing: 10pt)[
  #grid(
    columns: (1fr, auto),
    [#text(size: 10.8pt, fill: rgb("#1E3A8A"), weight: "bold")[${d.num}.] #text(size: 10.8pt, weight: "bold", fill: rgb("#0F172A"))[${sanitizeTypst(d.enunciado)}]],
    [#text(size: 9.5pt, weight: "bold", fill: rgb("#2563EB"))[[${sanitizeTypst(d.puntos)}]]]
  )${citaBlock}${pautasBlock}
  #lineas-pautadas(${d.lineas || 6})
]`;
  }

  // Renderizador de banner de sección
  function renderBanner(titulo: string, desc?: string) {
    return `#block(
  fill: rgb("#F1F5F9"),
  stroke: (left: 3.5pt + rgb("#2563EB"), rest: 0.5pt + rgb("#CBD5E1")),
  inset: (x: 8pt, y: 5pt),
  radius: (right: 3pt),
  width: 100%,
  spacing: 8pt
)[
  #text(weight: "bold", size: 10.5pt, fill: rgb("#0F172A"))[${sanitizeTypst(titulo)}]
  ${desc ? `\\ #v(1.5pt) #text(size: 9.0pt, fill: rgb("#475569"))[${sanitizeTypst(desc)}]` : ''}
]`;
  }

  // Construir el cuerpo Typst respetando el orden secuencial del Markdown
  const bodyTypstChunks: string[] = [];
  let inColumns = false;

  function closeColumns() {
    if (inColumns) {
      bodyTypstChunks.push(`]\n`);
      inColumns = false;
    }
  }

  function openColumns() {
    if (!inColumns) {
      bodyTypstChunks.push(`\n#columns(2, gutter: 18pt)[\n`);
      inColumns = true;
    }
  }

  for (const el of data.elementos) {
    if (el.type === 'pagebreak') {
      closeColumns();
      bodyTypstChunks.push('\n#pagebreak()\n');
      continue;
    }

    if (el.type === 'banner') {
      closeColumns();
      bodyTypstChunks.push(`\n${renderBanner(el.titulo, el.desc)}\n#v(4pt)\n`);
      continue;
    }

    if (el.type === 'cita') {
      closeColumns();
      bodyTypstChunks.push(`\n#caja-cita-examen("${sanitizeTypst(el.texto)}")\n#v(4pt)\n`);
      continue;
    }

    if (el.type === 'test') {
      // Las preguntas tipo test se colocan armónicamente en 2 columnas
      openColumns();
      bodyTypstChunks.push(renderPreguntaTest(el.q) + '\n\n');
      continue;
    }

    if (el.type === 'desarrollo') {
      // Las preguntas de desarrollo se renderizan a ancho completo para dar espacio a las líneas pautadas
      closeColumns();
      bodyTypstChunks.push(renderPreguntaDesarrollo(el.q) + '\n#v(10pt)\n');
      continue;
    }
  }

  closeColumns();

  return `// =============================================================================
// PLANTILLA OFICIAL DE EXAMEN • RELIGIÓN CATÓLICA
// Departamento de Religión Católica • Flujo continuo adaptativo
// =============================================================================

#set document(title: "Examen - ${sanitizeTypst(data.titulo)}", author: "Departamento de Religión")

#set page(
  paper: "a4",
  flipped: false,
  margin: (top: 1.15cm, bottom: 1.15cm, left: 1.25cm, right: 1.25cm),
  header-ascent: 0.45cm,
  footer-descent: 0.45cm,
  header: context {
    if counter(page).get().first() > 1 {
      text(size: 8pt, fill: rgb("#64748B"), font: "Helvetica Neue")[
        #grid(
          columns: (1fr, 1fr),
          align: (left, right),
          [#strong[${headerDept}]],
          [#strong[${sanitizeTypst(data.titulo).toUpperCase()}]]
        )
        #v(2.5pt)
        #line(length: 100%, stroke: 0.5pt + rgb("#CBD5E1"))
      ]
    }
  },
  footer: context {
    text(size: 8pt, fill: rgb("#94A3B8"), font: "Helvetica Neue")[
      #line(length: 100%, stroke: 0.5pt + rgb("#E2E8F0"))
      #v(3pt)
      #grid(
        columns: (1fr, 1fr, 1fr),
        align: (left, center, right),
        [Ref: 2026-REL-EXAM],
        [${headerDept}],
        [${isVa ? "Pàgina" : "Página"} #counter(page).display("1 de 1", both: true)]
      )
    ]
  }
)

#set text(
  font: ("Helvetica Neue", "Arial", "sans-serif"),
  size: 10.5pt,
  fill: rgb("#1F2937"),
  lang: "${isVa ? 'ca' : 'es'}"
)

#set par(justify: false, leading: 0.44em)

// COMPONENTES GRÁFICOS
#let badge(letra) = box(
  width: 13pt,
  height: 13pt,
  radius: 6.5pt,
  stroke: 0.6pt + rgb("#94A3B8"),
  fill: rgb("#F8FAFC"),
  align(center + horizon)[#text(size: 8pt, weight: "bold", fill: rgb("#334155"))[#letra]]
)

#let opcion(letra, texto) = block(spacing: 3.6pt)[
  #grid(
    columns: (15.5pt, 1fr),
    gutter: 4.5pt,
    align: (top + center, top + left),
    badge(letra),
    par(leading: 0.38em, justify: false)[#text(size: 10.2pt, fill: rgb("#374151"))[#texto]]
  )
]

#let pregunta-test(num, enunciado, a, b, c, d, spacing_bottom: 6.8pt) = block(breakable: false, spacing: spacing_bottom)[
  #text(size: 10.8pt, fill: rgb("#1E3A8A"), weight: "bold")[#num.] #text(size: 10.8pt, weight: "bold", fill: rgb("#0F172A"))[#enunciado]
  #v(2.5pt)
  #opcion("a", a)
  #opcion("b", b)
  #opcion("c", c)
  #opcion("d", d)
]

#let lineas-pautadas(n, espaciado: 12.5pt) = block(spacing: 5pt)[
  #for _ in range(n) [
    #v(espaciado)
    #line(length: 100%, stroke: (paint: rgb("#CBD5E1"), thickness: 0.6pt, dash: "dotted"))
  ]
]

#let caja-cita-examen(texto) = block(
  fill: rgb("#F8FAFC"),
  stroke: (left: 3pt + rgb("#94A3B8"), rest: 0.5pt + rgb("#E2E8F0")),
  radius: (right: 4pt),
  inset: (x: 10pt, y: 6pt),
  width: 100%,
  spacing: 6pt
)[
  #text(size: 9.8pt, font: "Georgia", style: "italic", fill: rgb("#334155"))[#texto]
]

// CABECERA INSTITUCIONAL (PÁGINA 1)
#grid(
  columns: (1fr,),
  align: left,
  [#text(size: 10.5pt, weight: "bold", tracking: 0.08em, fill: rgb("#1E293B"))[${headerDept}]]
)
#v(2.5pt)
#line(length: 100%, stroke: 1.5pt + rgb("#1E293B"))
#v(2.5pt)

#grid(
  columns: (1.1fr, 1fr),
  gutter: 16pt,
  [
    #text(size: 18pt, weight: "bold", fill: rgb("#0F172A"))[${sanitizeTypst(data.titulo).toUpperCase()}] \\
    #v(2pt)
    #text(size: 10.5pt, style: "italic", fill: rgb("#475569"))[${sanitizeTypst(data.subtitulo)}]
  ],
  [
    #set text(size: 8.5pt)
    #rect(width: 100%, stroke: 0.6pt + rgb("#CBD5E1"), radius: 4pt, inset: 6pt, fill: rgb("#F8FAFC"))[
      #grid(
        columns: (auto, 1fr),
        row-gutter: 5pt,
        gutter: 6pt,
        [#strong[${isVa ? "ALUMNE/A:" : "ALUMNO/A:"}]], [#line(length: 100%, stroke: 0.6pt + rgb("#94A3B8"))],
        [#strong[${isVa ? "CURS:" : "CURSO:"}]], [
          #grid(
            columns: (1fr, auto, 1fr, auto, 1fr),
            gutter: 4pt,
            [#align(left)[#text(size: 8.5pt)[${sanitizeTypst(data.curso)}]]],
            [#strong[${isVa ? "DATA:" : "FECHA:"}]],
            [#line(length: 100%, stroke: 0.6pt + rgb("#94A3B8"))],
            [#strong[NOTA:]],
            [#line(length: 100%, stroke: 0.6pt + rgb("#94A3B8"))]
          )
        ]
      )
    ]
  ]
)

#v(2.5pt)
#line(length: 100%, stroke: 0.6pt + rgb("#E2E8F0"))
#v(2.5pt)

#rect(
  width: 100%,
  stroke: 0.6pt + rgb("#BFDBFE"),
  radius: 3pt,
  inset: (x: 8pt, y: 4.5pt),
  fill: rgb("#EFF6FF")
)[
  #text(size: 10.0pt, fill: rgb("#1E40AF"))[
    #strong[${isVa ? "INSTRUCCIONS:" : "INSTRUCCIONES:"}] ${cleanInst}
  ]
]

#v(4pt)

// CONTENIDO PRINCIPAL DEL EXAMEN
${bodyTypstChunks.join('\n')}
`;
}

// -------------------------------------------------------------
// 2. SOLUCIONARIO OFICIAL (1 PÁGINA)
// -------------------------------------------------------------
function generateSolucionarioTypst(data: ReturnType<typeof parseExamenMarkdown>, _tipo: ExamenTipo, isVa: boolean): string {
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";

  const respuestasTestTypst = data.preguntasTest.map(q => {
    const c = q.opciones.find(o => o.correcta);
    const letra = c ? c.letra.toUpperCase() : 'A';
    const texto = c ? c.texto : '';
    return `  #item-solucionario("${q.num}", "${letra}", "${sanitizeTypst(texto)}")`;
  }).join('\n');

  const desarrolloSolTypst = data.preguntasDesarrollo.map(d => `
  #block(stroke: 0.5pt + rgb("#CBD5E1"), fill: rgb("#F8FAFC"), inset: 7pt, radius: 4pt, width: 100%)[
    #grid(
      columns: (1fr, auto),
      [#text(weight: "bold", size: 10pt, fill: rgb("#1E3A8A"))[Pregunta ${d.num}] #text(size: 9pt, fill: rgb("#475569"))[(${sanitizeTypst(d.puntos)})]],
      [#text(size: 8.5pt, fill: rgb("#16A34A"), weight: "bold")[${isVa ? "CRITERIS OFICIALS" : "CRITERIOS OFICIALES"}]]
    )
    #v(2pt)
    #text(size: 9.2pt, fill: rgb("#334155"))[#strong[${isVa ? "Enunciat:" : "Enunciado:"}] ${sanitizeTypst(d.enunciado)}]
    ${d.pautas ? `#v(2pt)\n    #text(size: 9pt, fill: rgb("#2563EB"))[#strong[${isVa ? "Pautes de correcció:" : "Pautas de corrección:"}] ${sanitizeTypst(d.pautas)}]` : ''}
  ]
`).join('\n#v(5pt)\n');

  return `// =============================================================================
// SOLUCIONARIO OFICIAL • RELIGIÓN CATÓLICA (1 PÁGINA)
// =============================================================================

#set document(title: "Solucionario - ${sanitizeTypst(data.titulo)}", author: "Departamento de Religión")

#set page(
  paper: "a4",
  margin: (top: 1.6cm, bottom: 1.6cm, left: 1.3cm, right: 1.3cm),
  header-ascent: 0.55cm,
  footer-descent: 0.55cm,
  header: text(size: 8pt, fill: rgb("#64748B"), font: "Helvetica Neue")[
    #grid(
      columns: (1fr, 1fr),
      align: (left, right),
      [#strong[${headerDept}]],
      [#strong[${isVa ? "SOLUCIONARI OFICIAL" : "SOLUCIONARIO OFICIAL"}]]
    )
    #v(2pt)
    #line(length: 100%, stroke: 0.5pt + rgb("#CBD5E1"))
  ],
  footer: text(size: 8pt, fill: rgb("#94A3B8"), font: "Helvetica Neue")[
    #line(length: 100%, stroke: 0.5pt + rgb("#E2E8F0"))
    #v(2.5pt)
    #grid(
      columns: (1fr, 1fr),
      align: (left, right),
      [${isVa ? "Material Docent Confidencial" : "Material Docente Confidencial"}],
      [${isVa ? "Pàgina" : "Página"} #counter(page).display("1 de 1", both: true)]
    )
  ]
)

#set text(font: ("Helvetica Neue", "Arial", "sans-serif"), size: 10pt, fill: rgb("#1F2937"), lang: "${isVa ? 'ca' : 'es'}")
#set par(justify: false, leading: 0.44em)

#let item-solucionario(num, letra, texto) = block(spacing: 5pt)[
  #grid(
    columns: (18pt, 18pt, 1fr),
    gutter: 4pt,
    align: (left + horizon, center + horizon, left + horizon),
    text(weight: "bold", size: 9.5pt, fill: rgb("#1E3A8A"))[#num.],
    box(fill: rgb("#DCFCE7"), stroke: 0.6pt + rgb("#86EFAC"), radius: 3pt, inset: 2.5pt)[
      #text(weight: "bold", size: 9pt, fill: rgb("#15803D"))[#letra]
    ],
    text(size: 9pt, fill: rgb("#374151"))[#texto]
  )
]

// CABECERA
#rect(width: 100%, fill: rgb("#F0FDF4"), stroke: 1pt + rgb("#86EFAC"), radius: 4pt, inset: 8pt)[
  #grid(
    columns: (1fr, auto),
    align: (left + horizon, right + horizon),
    [
      #text(size: 13pt, weight: "bold", fill: rgb("#166534"))[${isVa ? "SOLUCIONARI I CRITERIS DE CORRECCIÓ" : "SOLUCIONARIO Y CRITERIOS DE CORRECCIÓN"}] \\
      #v(2pt)
      #text(size: 9pt, fill: rgb("#15803D"))[${sanitizeTypst(data.curso)} • ${sanitizeTypst(data.subtitulo)}]
    ],
    box(fill: rgb("#DCFCE7"), radius: 3pt, inset: (x: 8pt, y: 4pt))[
      #text(size: 8.5pt, weight: "bold", fill: rgb("#166534"))[CLAU DOCENT]
    ]
  )
]

#v(8pt)

${respuestasTestTypst ? `#columns(2, gutter: 16pt)[\n${respuestasTestTypst}\n]\n#v(8pt)` : ''}

${desarrolloSolTypst}
`;
}
