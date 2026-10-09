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
  let preguntasPagina = "";
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
    if (line.startsWith('# PREGUNTAS_PAGINA:') || line.startsWith('# PREGUNTES_PAGINA:') || line.startsWith('# DISTRIBUCION_TEST:')) {
      preguntasPagina = line.substring(line.indexOf(':') + 1).trim();
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
    if (line.startsWith('## ') || line.startsWith('# PREGUNTAS') || line.startsWith('# PARTE')) {
      currentTest = null;
      currentDes = null;
      const bannerText = line.replace(/^#+\s*/, '').trim();
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

  return { titulo, subtitulo, curso, instrucciones, preguntasPagina, elementos, preguntasTest, preguntasDesarrollo };
}

function parseDistribution(input: string, total: number, defaultPerChunk = 10): number[] {
  const parts = input.split(/[,;\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  if (parts.length === 0) {
    if (total <= 0) return [defaultPerChunk];
    const res: number[] = [];
    let rem = total;
    while (rem > 0) {
      const take = Math.min(defaultPerChunk, rem);
      res.push(take);
      rem -= take;
    }
    return res;
  }
  return parts;
}

export function generateExamenTypst(
  markdown: string,
  tipo: ExamenTipo,
  docType: ExamenDocType,
  lang: Language,
  preguntasPorPagina?: string
): string {
  const isVa = lang === 'va';
  const data = parseExamenMarkdown(markdown);
  const distSetting = preguntasPorPagina?.trim() || data.preguntasPagina?.trim() || (tipo === 'test' ? '10, 10' : '10');

  if (docType === 'solucionario') {
    return generateSolucionarioTypst(data, tipo, isVa);
  }

  return generateExamenCompletoTypst(data, tipo, isVa, distSetting);
}

// -------------------------------------------------------------
// 1. GENERADOR PRINCIPAL DE EXAMEN CON 2 COLUMNAS SIMÉTRICAS
// -------------------------------------------------------------
function generateExamenCompletoTypst(
  data: ReturnType<typeof parseExamenMarkdown>,
  tipo: ExamenTipo,
  isVa: boolean,
  distSetting: string
): string {
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";
  const numTest = data.preguntasTest.length;

  // Instrucciones editables / heredadas del Markdown
  let cleanInst = data.instrucciones.replace(/^(?:INSTRUCCIONES|INSTRUCCIONS):\s*/i, '');
  if (!cleanInst) {
    if (tipo === 'test') {
      const ptos = numTest > 0 ? (10 / numTest).toFixed(2).replace('.', ',') : '0,50';
      cleanInst = isVa
        ? `Llig atentament cada qüestió. Marca amb una creu o cercle l'opció correcta per a cada enunciat. Cada encert suma ${ptos} punts. Les respostes incorrectes no penalitzen.`
        : `Lee atentamente cada cuestión. Marca con una cruz o círculo la opción correcta para cada enunciado. Cada acierto suma ${ptos} puntos. Las respuestas incorrectas no penalizan.`;
    } else if (tipo === 'mixto') {
      cleanInst = isVa
        ? `PARTE I (Test): Respon a les qüestions d'opció múltiple (5,0 punts). PARTE II (Desenvolupament): Respon amb rigor i claredat en l'espai pautat (5,0 punts).`
        : `PARTE I (Test): Responde a las preguntas de opción múltiple (5,0 puntos). PARTE II (Desarrollo): Responde con claridad y rigor en el espacio pautado (5,0 puntos).`;
    } else {
      cleanInst = isVa
        ? `Respon de manera raonada a cadascuna de les qüestions proposades, emprant el vocabulari teològic i moral adequat i respectant l'espai d'escriptura pautat.`
        : `Responde de manera razonada a cada una de las cuestiones propuestas, empleando el vocabulario teológico y moral adecuado y respetando el espacio de escritura pautado.`;
    }
  }

  function renderPreguntaTest(q: PreguntaTest, spacingBottom: string) {
    const a = q.opciones.find(o => o.letra === 'a')?.texto || '';
    const b = q.opciones.find(o => o.letra === 'b')?.texto || '';
    const c = q.opciones.find(o => o.letra === 'c')?.texto || '';
    const d = q.opciones.find(o => o.letra === 'd')?.texto || '';
    return `#pregunta-test("${q.num}", "${sanitizeTypst(q.enunciado)}", "${sanitizeTypst(a)}", "${sanitizeTypst(b)}", "${sanitizeTypst(c)}", "${sanitizeTypst(d)}", spacing_bottom: ${spacingBottom})`;
  }

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
  ${desc ? `\\ \n  #text(size: 9pt, style: "italic", fill: rgb("#64748B"))[${sanitizeTypst(desc)}]` : ''}
]`;
  }

  function renderTestGrid(questions: PreguntaTest[]): string {
    if (questions.length === 0) return '';
    const qCount = questions.length;
    let spacingBottom = '6.8pt';
    if (qCount <= 8) spacingBottom = '7.8pt';
    else if (qCount > 10) spacingBottom = '5.2pt';

    const mid = Math.ceil(qCount / 2);
    const left = questions.slice(0, mid);
    const right = questions.slice(mid);

    const leftCode = left.map(q => renderPreguntaTest(q, spacingBottom)).join('\n\n');
    const rightCode = right.map(q => renderPreguntaTest(q, spacingBottom)).join('\n\n');

    return `#grid(
  columns: (1fr, 1fr),
  gutter: 14pt,
  align: top + left,
  [
${leftCode}
  ],
  [
${rightCode}
  ]
)`;
  }

  // --- ENSAMBLADO DEL DOCUMENTO SEGÚN DISTRIBUCIÓN ---
  const bodyTypstChunks: string[] = [];

  if (tipo === 'test') {
    // Examen 100% test: distribuir preguntas según configuración
    const pagePlan = parseDistribution(distSetting, data.preguntasTest.length, 10);
    let questionIdx = 0;

    // Detectar banner inicial si existe
    const firstBanner = data.elementos.find(el => el.type === 'banner');
    if (firstBanner && firstBanner.type === 'banner') {
      bodyTypstChunks.push(renderBanner(firstBanner.titulo, firstBanner.desc) + '\n#v(4pt)\n');
    }

    let pageNum = 0;
    while (questionIdx < data.preguntasTest.length) {
      if (pageNum > 0) {
        bodyTypstChunks.push('\n#pagebreak()\n');
      }

      const takeCount = pageNum < pagePlan.length ? pagePlan[pageNum] : 10;
      const pageQuestions = data.preguntasTest.slice(questionIdx, questionIdx + takeCount);
      questionIdx += takeCount;

      bodyTypstChunks.push(renderTestGrid(pageQuestions));
      pageNum++;
    }
  } else if (tipo === 'mixto') {
    // Examen mixto: parte test en página 1 (o según distribución) y desarrollo en página 2+
    const pagePlan = parseDistribution(distSetting, data.preguntasTest.length, 10);
    let questionIdx = 0;

    // Buscar banner para parte test
    const testBanner = data.elementos.find(el => el.type === 'banner' && (el.titulo.includes('TEST') || el.titulo.includes('PARTE 1') || el.titulo.includes('PARTE I')));
    if (testBanner && testBanner.type === 'banner') {
      bodyTypstChunks.push(renderBanner(testBanner.titulo, testBanner.desc) + '\n#v(4pt)\n');
    } else {
      bodyTypstChunks.push(renderBanner(isVa ? "PART I: PREGUNTES TIPUS TEST" : "PARTE I: PREGUNTAS TIPO TEST") + '\n#v(4pt)\n');
    }

    let testPageNum = 0;
    while (questionIdx < data.preguntasTest.length) {
      if (testPageNum > 0) {
        bodyTypstChunks.push('\n#pagebreak()\n');
      }

      const takeCount = testPageNum < pagePlan.length ? pagePlan[testPageNum] : 10;
      const pageQuestions = data.preguntasTest.slice(questionIdx, questionIdx + takeCount);
      questionIdx += takeCount;

      bodyTypstChunks.push(renderTestGrid(pageQuestions));
      testPageNum++;
    }

    // Salto de página para la parte de desarrollo
    bodyTypstChunks.push('\n#pagebreak()\n');

    // Banner para parte de desarrollo
    const desBanner = data.elementos.find(el => el.type === 'banner' && (el.titulo.includes('DESARROLLO') || el.titulo.includes('DESENVOLUPAMENT') || el.titulo.includes('PARTE 2') || el.titulo.includes('PARTE II')));
    if (desBanner && desBanner.type === 'banner') {
      bodyTypstChunks.push(renderBanner(desBanner.titulo, desBanner.desc) + '\n#v(6pt)\n');
    } else {
      bodyTypstChunks.push(renderBanner(isVa ? "PART II: PREGUNTES DE DESENVOLUPAMENT" : "PARTE II: PREGUNTAS DE DESARROLLO") + '\n#v(6pt)\n');
    }

    // Preguntas de desarrollo
    for (const d of data.preguntasDesarrollo) {
      bodyTypstChunks.push(renderPreguntaDesarrollo(d) + '\n#v(6pt)\n');
    }
  } else {
    // Examen de desarrollo completo
    for (const el of data.elementos) {
      if (el.type === 'pagebreak') {
        bodyTypstChunks.push('\n#pagebreak()\n');
        continue;
      }
      if (el.type === 'banner') {
        bodyTypstChunks.push(`\n${renderBanner(el.titulo, el.desc)}\n#v(6pt)\n`);
        continue;
      }
      if (el.type === 'cita') {
        bodyTypstChunks.push(`\n#caja-cita-examen("${sanitizeTypst(el.texto)}")\n#v(6pt)\n`);
        continue;
      }
      if (el.type === 'desarrollo') {
        bodyTypstChunks.push(renderPreguntaDesarrollo(el.q) + '\n#v(8pt)\n');
        continue;
      }
      if (el.type === 'test') {
        bodyTypstChunks.push(renderPreguntaTest(el.q, '6.8pt') + '\n\n');
        continue;
      }
    }
  }

  return `// =============================================================================
// PLANTILLA OFICIAL DE EXAMEN • RELIGIÓN CATÓLICA
// Departamento de Religión Católica • 2 columnas simétricas
// =============================================================================

#set document(
  title: "${sanitizeTypst(data.titulo)} - ${sanitizeTypst(data.subtitulo)}",
  author: "${headerDept}"
)

#set page(
  paper: "a4",
  margin: (top: 1.8cm, bottom: 1.8cm, left: 1.25cm, right: 1.25cm),
  header-ascent: 0.6cm,
  footer-descent: 0.6cm,
  header: context {
    if counter(page).get().first() > 1 [
      #grid(
        columns: (1fr, auto),
        align: (left + bottom, right + bottom),
        text(7.8pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(data.curso)} • ${sanitizeTypst(data.titulo.toUpperCase())}],
        text(7.8pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "bold")[${isVa ? "EXAMEN OFICIAL" : "EXAMEN OFICIAL"}]
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
      text(7.2pt, fill: rgb("#52796F"), font: "Helvetica Neue")[${headerDept} • EXAMEN],
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
  font: ("Helvetica Neue", "Arial", "Noto Sans CJK SC", "Noto Serif CJK SC", "sans-serif"),
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
// 2. SOLUCIONARIO OFICIAL (CORPORATIVO CON CJK)
// -------------------------------------------------------------
function generateSolucionarioTypst(
  data: ReturnType<typeof parseExamenMarkdown>,
  _tipo: ExamenTipo,
  isVa: boolean
): string {
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";

  const respuestasTestTypst = data.preguntasTest.map(q => {
    const c = q.opciones.find(o => o.correcta);
    const letra = c ? c.letra.toUpperCase() : 'A';
    const texto = c ? c.texto : '';
    return `  #item-solucionario("${q.num}", "${letra}", "${sanitizeTypst(texto)}")`;
  }).join('\n');

  const desarrolloSolTypst = data.preguntasDesarrollo.map(d => `
  #block(stroke: 0.5pt + rgb("#CAD2C5"), fill: rgb("#EDF4F2"), inset: 7pt, radius: 4pt, width: 100%)[
    #grid(
      columns: (1fr, auto),
      [#text(weight: "bold", size: 10pt, fill: rgb("#52796F"))[Pregunta ${d.num}] #text(size: 9pt, fill: rgb("#2F3E46"))[(${sanitizeTypst(d.puntos)})]],
      [#text(size: 8pt, fill: rgb("#D08C51"), weight: "bold")[${isVa ? "CRITERI DE CORRECCIÓ" : "CRITERIO DE CORRECCIÓN"}]]
    )
    #v(3pt)
    #text(size: 9.2pt, weight: "bold", fill: rgb("#2F3E46"))[${sanitizeTypst(d.enunciado)}]
    ${d.pautas ? `\n    #v(2.5pt)\n    #text(size: 8.8pt, fill: rgb("#52796F"), style: "italic")[${isVa ? "Termes i conceptes exigibles" : "Términos y conceptos exigibles"}: ${sanitizeTypst(d.pautas)}]` : ''}
  ]
  #v(4pt)
`).join('\n');

  return `// =============================================================================
// SOLUCIONARIO OFICIAL • RELIGIÓ CATÒLICA
// Sistema de Diseño Pastel Corporativo (Uso Docente)
// =============================================================================

#set document(title: "Solucionario - ${sanitizeTypst(data.titulo)}", author: "Departamento de Religión")

#set page(
  paper: "a4",
  margin: (top: 1.8cm, bottom: 1.8cm, left: 1.3cm, right: 1.3cm),
  header-ascent: 0.6cm,
  footer-descent: 0.6cm,
  header: context [
    #grid(
      columns: (1fr, auto),
      align: (left + bottom, right + bottom),
      text(7.8pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(data.curso)} • ${sanitizeTypst(data.titulo.toUpperCase())}],
      text(7.8pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "bold")[${isVa ? "SOLUCIONARI OFICIAL" : "SOLUCIONARIO OFICIAL"}]
    )
    #v(2.5pt)
    #line(length: 100%, stroke: 0.6pt + rgb("#CAD2C5"))
  ],
  footer: context [
    #line(length: 100%, stroke: 0.6pt + rgb("#E0E7E3"))
    #v(3.5pt)
    #grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      text(7.2pt, fill: rgb("#52796F"), font: "Helvetica Neue")[${headerDept} • SOLUCIONARIO],
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
  size: 10.5pt,
  fill: rgb("#263238"),
  lang: "${isVa ? 'ca' : 'es'}"
)

#let item-solucionario(num, letra, texto) = block(spacing: 3.8pt)[
  #grid(
    columns: (18pt, 16pt, 1fr),
    gutter: 4pt,
    align: (horizon + left, horizon + center, horizon + left),
    text(weight: "bold", size: 9.5pt, fill: rgb("#52796F"))[#num.],
    circle(radius: 6pt, fill: rgb("#52796F"))[#align(center + horizon)[#text(size: 7.5pt, weight: "bold", fill: white)[#letra]]],
    text(size: 9.2pt, fill: rgb("#2F3E46"))[#texto]
  )
]

// CABECERA SOLUCIONARIO
#block(
  fill: rgb("#EDF4F2"),
  stroke: 1pt + rgb("#84A98C"),
  radius: 4pt,
  inset: (x: 12pt, y: 8pt),
  width: 100%
)[
  #grid(
    columns: (1fr, auto),
    align: horizon,
    [
      #text(size: 14pt, weight: "bold", fill: rgb("#2F3E46"), font: "Helvetica Neue")[${isVa ? "SOLUCIONARI I CRITERIS DE CORRECCIÓ" : "SOLUCIONARIO Y CRITERIOS DE CORRECCIÓN"}] \\
      #v(2pt)
      #text(size: 9pt, fill: rgb("#52796F"), font: "Helvetica Neue")[${sanitizeTypst(data.curso)} • ${sanitizeTypst(data.subtitulo)}]
    ],
    box(fill: white, stroke: 0.6pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 8pt, y: 4pt))[
      #text(size: 8.5pt, weight: "bold", fill: rgb("#52796F"), font: "Helvetica Neue")[${isVa ? "CLAU DOCENT" : "CLAVE DOCENTE"}]
    ]
  )
]

#v(8pt)

${respuestasTestTypst ? `#columns(2, gutter: 16pt)[\n${respuestasTestTypst}\n]\n#v(8pt)` : ''}

${desarrolloSolTypst}
`;
}
