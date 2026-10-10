import type { Language, ExamenTipo, ExamenDocType, FontSizesConfig } from '../types';

export interface PreguntaTest {
  num: number;
  enunciado: string;
  opciones: { letra: string; texto: string; correcta: boolean }[];
  solucionLetra?: string;
  solucionTexto?: string;
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
  let instruccionesPresente = false;
  let preguntasPagina = "";
  const elementos: ExamenElement[] = [];
  const preguntasTest: PreguntaTest[] = [];
  const preguntasDesarrollo: PreguntaDesarrollo[] = [];
  const solucionarioMap = new Map<number, { letra: string; texto: string }>();
  const solucionarioDesarrolloMap = new Map<number, string>();
  let inSolucionarioSection = false;

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
    
    // Detección robusta de instrucciones editables en Markdown
    const instMatch = line.match(/^(?:#\s*|\*{2}|>\s*\*{2}|-\s*)?(?:INSTRUCCIONES|INSTRUCCIONS):?\*{0,2}\s*(.*)/i);
    if (instMatch && (line.toUpperCase().includes('INSTRUCCIONES') || line.toUpperCase().includes('INSTRUCCIONS')) && !line.startsWith('## PREGUNTAS') && !line.startsWith('## PARTE')) {
      instruccionesPresente = true;
      instrucciones = instMatch[1].replace(/^\*{0,2}\s*/, '').trim();
      continue;
    }
    if (line.startsWith('# PREGUNTAS_PAGINA:') || line.startsWith('# PREGUNTES_PAGINA:') || line.startsWith('# DISTRIBUCION_TEST:')) {
      preguntasPagina = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }

    // Detección de cabecera de SOLUCIONARIO al final del documento
    const isSolucionarioHeader = /^(?:#+\s*)?(?:SOLUCIONARIO|SOLUCIONS|SOLUCIONES|CLAVE DE RESPUESTAS|CLAU DE RESPOSTES|CLAVE|CLAU|RESPUESTAS CORRECTAS|RESPOSTES CORRECTES|RESPUESTAS|RESPOSTES)\b/i.test(line);
    if (isSolucionarioHeader) {
      inSolucionarioSection = true;
      currentTest = null;
      currentDes = null;
      // Si justo antes había un salto de página por '---', lo retiramos para no dejar página en blanco al final
      if (elementos.length > 0 && elementos[elementos.length - 1].type === 'pagebreak') {
        elementos.pop();
      }
      continue;
    }

    // Si estamos dentro del bloque SOLUCIONARIO, procesar exclusivamente las claves de respuestas
    if (inSolucionarioSection) {
      if (line === '---' || line === '***') continue;

      // Línea de clave tipo test: e.g. "1. a) A la razón...", "1. A", "1-B", "1: C", "1. (D)"
      const solMatch = line.match(/^(?:[-*•]\s*)?\*?(\d+)(?:[\.\):]|\s+-\s*|\s+)\s*[\(\[\*]?([a-dA-D])[\)\]\.\:\-\*]?\s*(.*)/);
      if (solMatch) {
        const qNum = parseInt(solMatch[1], 10);
        const letra = solMatch[2].toUpperCase();
        const texto = solMatch[3]
          .replace(/^[-:\)\.]\s*/, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .replace(/^\*+|\*+$/g, '')
          .trim();
        solucionarioMap.set(qNum, { letra, texto });
        continue;
      }

      // Línea de pautas de desarrollo en solucionario si estuviera presente
      const desSolMatch = line.match(/^(\d+)[\.\)]\s*(.+)/);
      if (desSolMatch) {
        const num = parseInt(desSolMatch[1], 10);
        const pautas = desSolMatch[2].replace(/^\[(.*?)\]/, '$1').trim();
        solucionarioDesarrolloMap.set(num, pautas);
        continue;
      }
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
      let descLines: string[] = [];
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim() &&
        !lines[i + 1].trim().startsWith('#') &&
        !lines[i + 1].trim().match(/^\d+[\.\)]/) &&
        !lines[i + 1].trim().startsWith('---') &&
        !lines[i + 1].trim().startsWith('***') &&
        !lines[i + 1].trim().startsWith('>')
      ) {
        descLines.push(lines[i + 1].trim());
        i++;
      }
      const desc = descLines.join(' ');
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
        enunciado: desMatch[3].replace(/^\*\*(.*?)\*\*$/, '$1').replace(/^__(.*?)__$/, '$1').trim(),
        pautas: "",
        lineas: 6
      };
      preguntasDesarrollo.push(currentDes);
      elementos.push({ type: 'desarrollo', q: currentDes });
      continue;
    }

    // Opción de test: e.g. "*a) Opción", "b) Opción", "a. Opción", "- a) Opción"
    const optMatch = line.match(/^(?:[-*•]\s*)?(\*?)\(?([a-dA-D])[\)\.]\s*(.+)/i);
    if (optMatch && currentTest) {
      const isAsteriskMarked = optMatch[1] === '*' || line.startsWith('*') || /^\(?\*?[a-dA-D][\)\.]\s*\*/.test(line);
      const isMarkerMarked = /\[CORRECTA\]|\[X\]|\(CORRECTA\)|\(X\)/i.test(line);
      const isCorrecta = isAsteriskMarked || isMarkerMarked;
      const letra = optMatch[2].toLowerCase();
      const texto = optMatch[3]
        .replace(/\[CORRECTA\]/gi, '')
        .replace(/\[X\]/gi, '')
        .replace(/\(CORRECTA\)/gi, '')
        .replace(/\(X\)/gi, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/^\*+|\*+$/g, '')
        .trim();
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
      const qText = qMatch[2].replace(/^\*\*(.*?)\*\*$/, '$1').replace(/^__(.*?)__$/, '$1').trim();

      // Mirar hacia adelante para saber si es test o desarrollo
      let looksLikeTest = false;
      for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;
        if (nextLine.match(/^(?:[-*•]\s*)?\(?\*?[a-dA-D][\)\.]\s*/i)) {
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

  // Asociar claves del solucionario con las preguntas test y marcar la opción correcta
  for (const q of preguntasTest) {
    if (solucionarioMap.has(q.num)) {
      const sol = solucionarioMap.get(q.num)!;
      q.solucionLetra = sol.letra;
      const matchedOpt = q.opciones.find(o => o.letra.toUpperCase() === sol.letra);
      q.solucionTexto = sol.texto || (matchedOpt ? matchedOpt.texto : '');

      for (const opt of q.opciones) {
        opt.correcta = (opt.letra.toUpperCase() === sol.letra);
      }
    } else {
      const c = q.opciones.find(o => o.correcta);
      if (c) {
        q.solucionLetra = c.letra.toUpperCase();
        q.solucionTexto = c.texto;
      } else if (q.opciones.length > 0) {
        q.opciones[0].correcta = true;
        q.solucionLetra = q.opciones[0].letra.toUpperCase();
        q.solucionTexto = q.opciones[0].texto;
      }
    }
  }

  // Si por alguna razón preguntasTest estaba vacío pero se definieron respuestas en el solucionario
  if (preguntasTest.length === 0 && solucionarioMap.size > 0) {
    for (const [num, sol] of Array.from(solucionarioMap.entries()).sort((a, b) => a[0] - b[0])) {
      preguntasTest.push({
        num,
        enunciado: `Pregunta ${num}`,
        opciones: [{ letra: sol.letra.toLowerCase(), texto: sol.texto || '', correcta: true }],
        solucionLetra: sol.letra,
        solucionTexto: sol.texto,
      });
    }
  }

  // Asignar pautas a preguntas de desarrollo si venían en el solucionario
  for (const d of preguntasDesarrollo) {
    if (!d.pautas && solucionarioDesarrolloMap.has(d.num)) {
      d.pautas = solucionarioDesarrolloMap.get(d.num)!;
    }
  }

  return {
    titulo,
    subtitulo,
    curso,
    instrucciones,
    instruccionesPresente,
    preguntasPagina,
    elementos,
    preguntasTest,
    preguntasDesarrollo,
    solucionarioMap
  };
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
  preguntasPorPagina?: string,
  fontSizes?: FontSizesConfig
): string {
  const isVa = lang === 'va';
  const data = parseExamenMarkdown(markdown);
  const distSetting = preguntasPorPagina?.trim() || data.preguntasPagina?.trim() || (tipo === 'test' ? '10, 10' : '10');

  if (docType === 'solucionario') {
    return generateSolucionarioTypst(data, tipo, isVa, fontSizes);
  }

  return generateExamenCompletoTypst(data, tipo, isVa, distSetting, fontSizes);
}

// -------------------------------------------------------------
// 1. GENERADOR PRINCIPAL DE EXAMEN CON 2 COLUMNAS SIMÉTRICAS
// -------------------------------------------------------------
function generateExamenCompletoTypst(
  data: ReturnType<typeof parseExamenMarkdown>,
  tipo: ExamenTipo,
  isVa: boolean,
  distSetting: string,
  fontSizes?: FontSizesConfig
): string {
  const titulos = fontSizes?.titulos ?? 18.0;
  const apartados = fontSizes?.apartados ?? 10.8;
  const contenido = fontSizes?.contenido ?? 10.5;
  const instruccionesSize = fontSizes?.instrucciones ?? 9.5;

  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";

  // Instrucciones editables / heredadas del Markdown
  // ÚNICAMENTE se muestran si el usuario las ha incluido o no las ha borrado
  const cleanInst = data.instrucciones.replace(/^(?:INSTRUCCIONES|INSTRUCCIONS):\s*/i, '').trim();

  function renderPreguntaTest(q: PreguntaTest, spacingBottom: string) {
    const a = q.opciones.find(o => o.letra === 'a')?.texto || '';
    const b = q.opciones.find(o => o.letra === 'b')?.texto || '';
    const c = q.opciones.find(o => o.letra === 'c')?.texto || '';
    const d = q.opciones.find(o => o.letra === 'd')?.texto || '';
    return `#pregunta-test("${q.num}", "${sanitizeTypst(q.enunciado)}", "${sanitizeTypst(a)}", "${sanitizeTypst(b)}", "${sanitizeTypst(c)}", "${sanitizeTypst(d)}", spacing_bottom: ${spacingBottom})`;
  }

  function renderPreguntaDesarrollo(d: PreguntaDesarrollo) {
    const citaBlock = d.citaTexto ? `\n  #caja-cita-examen("${sanitizeTypst(d.citaTexto)}")` : '';
    const pautasBlock = d.pautas ? `\n  #v(2.5pt)\n  #text(size: ${(contenido * 0.90).toFixed(1)}pt, style: "italic", fill: rgb("#64748B"))[${isVa ? "Pautes" : "Pautas"}: ${sanitizeTypst(d.pautas)}]` : '';
    return `#block(breakable: false, spacing: 14pt)[
  #grid(
    columns: (1fr, auto),
    [#text(size: ${apartados}pt, fill: rgb("#1E3A8A"), weight: "bold")[${d.num}.] #text(size: ${apartados}pt, weight: "bold", fill: rgb("#0F172A"))[${sanitizeTypst(d.enunciado)}]],
    [#text(size: ${(apartados * 0.88).toFixed(1)}pt, weight: "bold", fill: rgb("#2563EB"))[[${sanitizeTypst(d.puntos)}]]]
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
  #text(weight: "bold", size: ${(instruccionesSize * 1.1).toFixed(1)}pt, fill: rgb("#0F172A"))[${sanitizeTypst(titulo)}]
  ${desc ? `\\ \n  #text(size: ${instruccionesSize}pt, style: "italic", fill: rgb("#64748B"))[${sanitizeTypst(desc)}]` : ''}
]`;
  }

  function renderTestGrid(questions: PreguntaTest[]): string {
    if (questions.length === 0) return '';
    const qCount = questions.length;
    // Espaciado dinámico ampliado para que las preguntas no queden apelmazadas
    let spacingBottom = '11.5pt';
    if (qCount <= 6) spacingBottom = '16.0pt';
    else if (qCount <= 8) spacingBottom = '13.5pt';
    else if (qCount <= 10) spacingBottom = '11.5pt';
    else spacingBottom = '9.5pt';

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

    // Detectar banner inicial si aporta contenido descriptivo no redundante
    const firstBanner = data.elementos.find(el => el.type === 'banner');
    if (firstBanner && firstBanner.type === 'banner') {
      const isRawIdentifier = firstBanner.titulo.toUpperCase() === 'PREGUNTAS_TEST' || firstBanner.titulo.toUpperCase() === 'PREGUNTES_TEST';
      if (!isRawIdentifier || firstBanner.desc) {
        const titleToShow = isRawIdentifier ? (isVa ? "PREGUNTES TIPUS TEST" : "PREGUNTAS TIPO TEST") : firstBanner.titulo;
        bodyTypstChunks.push(renderBanner(titleToShow, firstBanner.desc) + '\n#v(4pt)\n');
      }
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

    // Banner para parte test: SÓLO si está presente en el Markdown
    const testBanner = data.elementos.find(el => el.type === 'banner' && (el.titulo.toUpperCase().includes('TEST') || el.titulo.toUpperCase().includes('PARTE 1') || el.titulo.toUpperCase().includes('PARTE I') || el.titulo.toUpperCase().includes('PART 1') || el.titulo.toUpperCase().includes('PART I')));
    if (testBanner && testBanner.type === 'banner') {
      const isRawIdentifier = testBanner.titulo.toUpperCase() === 'PREGUNTAS_TEST' || testBanner.titulo.toUpperCase() === 'PREGUNTES_TEST';
      const displayTitle = isRawIdentifier ? (isVa ? "PART I: PREGUNTES TIPUS TEST" : "PARTE I: PREGUNTAS TIPO TEST") : testBanner.titulo;
      bodyTypstChunks.push(renderBanner(displayTitle, testBanner.desc) + '\n#v(5pt)\n');
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

    // Banner para parte de desarrollo: SÓLO si está presente en el Markdown
    const desBanner = data.elementos.find(el => el.type === 'banner' && (el.titulo.toUpperCase().includes('DESARROLLO') || el.titulo.toUpperCase().includes('DESENVOLUPAMENT') || el.titulo.toUpperCase().includes('PARTE 2') || el.titulo.toUpperCase().includes('PARTE II') || el.titulo.toUpperCase().includes('PART 2') || el.titulo.toUpperCase().includes('PART II')));
    if (desBanner && desBanner.type === 'banner') {
      const isRawIdentifier = desBanner.titulo.toUpperCase() === 'PREGUNTAS_DESARROLLO' || desBanner.titulo.toUpperCase() === 'PREGUNTES_DESARROLLO';
      const displayTitle = isRawIdentifier ? (isVa ? "PART II: PREGUNTES DE DESENVOLUPAMENT" : "PARTE II: PREGUNTAS DE DESARROLLO") : desBanner.titulo;
      bodyTypstChunks.push(renderBanner(displayTitle, desBanner.desc) + '\n#v(8pt)\n');
    }

    // Preguntas de desarrollo con separación holgada
    for (const d of data.preguntasDesarrollo) {
      bodyTypstChunks.push(renderPreguntaDesarrollo(d) + '\n#v(12pt)\n');
    }
  } else {
    // Examen de desarrollo completo
    for (const el of data.elementos) {
      if (el.type === 'pagebreak') {
        bodyTypstChunks.push('\n#pagebreak()\n');
        continue;
      }
      if (el.type === 'banner') {
        bodyTypstChunks.push(`\n${renderBanner(el.titulo, el.desc)}\n#v(8pt)\n`);
        continue;
      }
      if (el.type === 'cita') {
        bodyTypstChunks.push(`\n#caja-cita-examen("${sanitizeTypst(el.texto)}")\n#v(8pt)\n`);
        continue;
      }
      if (el.type === 'desarrollo') {
        bodyTypstChunks.push(renderPreguntaDesarrollo(el.q) + '\n#v(12pt)\n');
        continue;
      }
      if (el.type === 'test') {
        bodyTypstChunks.push(renderPreguntaTest(el.q, '11.5pt') + '\n\n');
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
    let pageNum = counter(page).get().first()
    if pageNum > 1 [
      #grid(
        columns: (1fr, auto),
        align: (left + bottom, right + bottom),
        text(8.8pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[${headerDept} • ${sanitizeTypst(data.curso).toUpperCase()}],
        text(8.8pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(data.titulo).toUpperCase()}${data.subtitulo ? ` -- ${sanitizeTypst(data.subtitulo)}` : ''}]
      )
      #v(3pt)
      #line(length: 100%, stroke: 0.6pt + rgb("#CAD2C5"))
    ]
  },
  footer: context [
    #line(length: 100%, stroke: 0.6pt + rgb("#E0E7E3"))
    #v(3.5pt)
    #grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      text(8pt, fill: rgb("#52796F"), font: "Helvetica Neue")[${headerDept} • ${isVa ? "Prova d'Avaluació" : "Prueba de Evaluación"}],
      box(
        fill: rgb("#EDF4F2"),
        stroke: 0.5pt + rgb("#CAD2C5"),
        radius: 3pt,
        inset: (x: 6pt, y: 2.5pt),
        baseline: 0%,
        text(8pt, weight: "bold", fill: rgb("#2F3E46"), font: "Helvetica Neue")[#counter(page).display("1 de 1", both: true)]
      )
    )
  ]
)

#set text(
  font: ("Helvetica Neue", "Arial", "Noto Sans CJK SC", "Noto Serif CJK SC", "sans-serif"),
  size: ${contenido}pt,
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
  align(center + horizon)[#text(size: 8pt, weight: "regular", fill: rgb("#334155"))[#letra]]
)

#let opcion(letra, texto) = block(spacing: 4.2pt)[
  #grid(
    columns: (15.5pt, 1fr),
    gutter: 4.5pt,
    align: (top + center, top + left),
    badge(letra),
    par(leading: 0.40em, justify: false)[#text(size: ${contenido}pt, weight: "regular", fill: rgb("#374151"))[#texto]]
  )
]

#let pregunta-test(num, enunciado, a, b, c, d, spacing_bottom: 11.5pt) = block(breakable: false, spacing: spacing_bottom)[
  #text(size: ${apartados}pt, fill: rgb("#1E3A8A"), weight: "bold")[#num.] #text(size: ${apartados}pt, weight: "bold", fill: rgb("#0F172A"))[#enunciado]
  #v(3.5pt)
  #opcion("a", a)
  #opcion("b", b)
  #opcion("c", c)
  #opcion("d", d)
]

#let lineas-pautadas(n, espaciado: 13.5pt) = block(spacing: 5pt)[
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
  #text(size: ${(contenido * 0.93).toFixed(1)}pt, font: "Georgia", style: "italic", fill: rgb("#334155"))[#texto]
]

// CABECERA INSTITUCIONAL (PÁGINA 1)
#v(-0.55cm)
#grid(
  columns: (1fr,),
  align: left,
  [#text(size: 10.5pt, weight: "bold", tracking: 0.08em, fill: rgb("#1E293B"))[${headerDept}]]
)
#v(2.5pt)
#line(length: 100%, stroke: 1.5pt + rgb("#1E293B"))
#v(3.5pt)

#grid(
  columns: (1.1fr, 1fr),
  gutter: 16pt,
  align: (left + horizon, right + horizon),
  [
    #text(size: ${titulos}pt, weight: "bold", fill: rgb("#0F172A"))[${sanitizeTypst(data.titulo).toUpperCase()}] \\
    #v(2pt)
    #text(size: ${(titulos * 0.58).toFixed(1)}pt, style: "italic", fill: rgb("#475569"))[${sanitizeTypst(data.subtitulo)}]
  ],
  [
    #align(right)[
      #block(width: 220pt)[
        #grid(
          columns: (auto, 1fr),
          gutter: 6pt,
          align: (left + horizon, left + horizon),
          [#text(size: 9.5pt, weight: "bold", fill: rgb("#1E293B"))[${isVa ? "Nom:" : "Nombre:"}]],
          [#box(width: 100%, stroke: (bottom: 0.8pt + rgb("#94A3B8")), baseline: 0pt)[#hide[A]]]
        )
        #v(5pt)
        #align(left)[
          #text(size: 9.5pt, weight: "bold", fill: rgb("#1E293B"))[${isVa ? "Curs:" : "Curso:"}] #text(size: 9.5pt, fill: rgb("#334155"))[${sanitizeTypst(data.curso)}]
        ]
      ]
    ]
  ]
)

#v(3pt)
#line(length: 100%, stroke: 0.6pt + rgb("#E2E8F0"))
#v(3pt)

${cleanInst ? `#rect(
  width: 100%,
  stroke: 0.6pt + rgb("#BFDBFE"),
  radius: 3pt,
  inset: (x: 8pt, y: 4.5pt),
  fill: rgb("#EFF6FF")
)[
  #text(size: ${instruccionesSize}pt, fill: rgb("#1E40AF"))[
    #strong[${isVa ? "INSTRUCCIONS:" : "INSTRUCCIONES:"}] ${sanitizeTypst(cleanInst)}
  ]
]
#v(4pt)` : ''}

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
  isVa: boolean,
  fontSizes?: FontSizesConfig
): string {
  const titulos = fontSizes?.titulos ?? 18.0;
  const contenido = fontSizes?.contenido ?? 10.5;
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";

  function renderItemSolucionario(q: PreguntaTest) {
    const c = q.opciones.find(o => o.correcta);
    const letra = q.solucionLetra ? q.solucionLetra.toUpperCase() : (c ? c.letra.toUpperCase() : 'A');
    const rawTexto = q.solucionTexto || (c ? c.texto : '');
    const texto = rawTexto
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/^\*+|\*+$/g, '')
      .trim();
    return `    #item-solucionario("${q.num}", "${letra}", "${sanitizeTypst(texto)}")`;
  }

  function renderSolucionarioGrid(questions: PreguntaTest[]): string {
    if (questions.length === 0) return '';
    const perPage = 22;
    const chunks: string[] = [];

    for (let start = 0; start < questions.length; start += perPage) {
      if (start > 0) {
        chunks.push('\n#pagebreak()\n');
      }
      const pageQs = questions.slice(start, start + perPage);
      const mid = Math.ceil(pageQs.length / 2);
      const left = pageQs.slice(0, mid);
      const right = pageQs.slice(mid);

      const leftCode = left.map(q => renderItemSolucionario(q)).join('\n');
      const rightCode = right.map(q => renderItemSolucionario(q)).join('\n');

      chunks.push(`#grid(
  columns: (1fr, 1fr),
  gutter: 18pt,
  align: top + left,
  [
${leftCode}
  ],
  [
${rightCode}
  ]
)`);
    }

    return chunks.join('\n');
  }

  // Criterios de desarrollo en el solucionario
  const desarrolloSolTypst = data.preguntasDesarrollo.length > 0 ? `
#v(10pt)
#line(length: 100%, stroke: 0.6pt + rgb("#CAD2C5"))
#v(5pt)
#text(weight: "bold", size: 10.2pt, fill: rgb("#2F3E46"))[${isVa ? "CRITERIS DE QUALIFICACIÓ • PREGUNTES DE DESENVOLUPAMENT" : "CRITERIOS DE CALIFICACIÓN • PREGUNTAS DE DESARROLLO"}]
#v(5pt)
` + data.preguntasDesarrollo.map(d => `
  #block(spacing: 8pt)[
    #text(weight: "bold", size: 10pt, fill: rgb("#52796F"))[${isVa ? "Pregunta" : "Pregunta"} ${d.num}.] #h(4pt)
    #text(weight: "bold", size: 9.8pt, fill: rgb("#0F172A"))[${sanitizeTypst(d.enunciado)}]
    ${d.puntos ? ` #text(size: 8.8pt, fill: rgb("#D08C51"), weight: "bold")[(${sanitizeTypst(d.puntos)})]` : ''}
    ${d.pautas ? `\\ \n    #v(2.5pt)\n    #text(size: 9pt, style: "italic", fill: rgb("#475569"))[${isVa ? "Criteris / pautes" : "Criterios / pautas"}: ${sanitizeTypst(d.pautas)}]` : ''}
  ]
`).join('\n') : '';

  const testGridTypst = renderSolucionarioGrid(data.preguntasTest);

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
      text(8.8pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[${sanitizeTypst(data.curso)} • ${sanitizeTypst(data.titulo.toUpperCase())}],
      text(8.8pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "bold")[${isVa ? "SOLUCIONARI OFICIAL" : "SOLUCIONARIO OFICIAL"}]
    )
    #v(3pt)
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
  font: ("Helvetica Neue", "Arial", "Noto Sans CJK SC", "Noto Serif CJK SC", "sans-serif"),
  size: ${contenido}pt,
  fill: rgb("#263238"),
  lang: "${isVa ? 'ca' : 'es'}"
)

#let item-solucionario(num, letra, texto) = block(spacing: 7.5pt)[
  #grid(
    columns: (18pt, 20pt, 1fr),
    gutter: 4pt,
    align: (top + left, top + left, top + left),
    text(weight: "bold", size: ${(contenido * 0.95).toFixed(1)}pt, fill: rgb("#52796F"))[#num.],
    box(
      fill: rgb("#52796F"),
      radius: 3pt,
      inset: (x: 4.5pt, y: 1.5pt),
      baseline: 0%,
      align(center + horizon)[#text(size: ${(contenido * 0.95).toFixed(1)}pt, weight: "bold", fill: white)[#letra]]
    ),
    par(leading: 0.40em, justify: false)[#text(size: ${(contenido * 0.92).toFixed(1)}pt, fill: rgb("#1E293B"))[#texto]]
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
      #text(size: ${(titulos * 0.78).toFixed(1)}pt, weight: "bold", fill: rgb("#2F3E46"))[${isVa ? "SOLUCIONARI OFICIAL" : "SOLUCIONARIO OFICIAL"}] \\
      #v(2pt)
      #text(size: 9pt, fill: rgb("#52796F"))[${sanitizeTypst(data.curso)} • ${sanitizeTypst(data.subtitulo)}]
    ],
    box(fill: white, stroke: 0.6pt + rgb("#CAD2C5"), radius: 3pt, inset: (x: 8pt, y: 4pt))[
      #text(size: 8.5pt, weight: "bold", fill: rgb("#52796F"))[${isVa ? "CLAU DOCENT" : "CLAVE DOCENTE"}]
    ]
  )
]

#v(10pt)

${testGridTypst}

${desarrolloSolTypst}
`;
}
