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
  citaTitulo?: string;
  citaTexto?: string;
  lineas: number;
}

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
  const preguntasTest: PreguntaTest[] = [];
  const preguntasDesarrollo: PreguntaDesarrollo[] = [];

  const lines = markdown.split('\n');
  let currentSection = 'test';
  let currentTest: PreguntaTest | null = null;
  let currentDes: PreguntaDesarrollo | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

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
    if (line.startsWith('# INSTRUCCIONES:')) {
      instrucciones = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }

    if (line.startsWith('## PREGUNTAS_TEST') || line.startsWith('## TEST') || line.startsWith('## PARTE I')) {
      currentSection = 'test';
      continue;
    }
    if (line.startsWith('## PREGUNTAS_DESARROLLO') || line.startsWith('## DESARROLLO') || line.startsWith('## PARTE II')) {
      currentSection = 'desarrollo';
      continue;
    }

    if (currentSection === 'test') {
      const qMatch = line.match(/^(\d+)[\.\)]\s*(.+)/);
      if (qMatch) {
        currentTest = {
          num: parseInt(qMatch[1], 10),
          enunciado: qMatch[2].trim(),
          opciones: []
        };
        preguntasTest.push(currentTest);
        continue;
      }

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
    } else {
      const desMatch = line.match(/^(\d+)[\.\)]\s*(?:\[(.*?)\])?\s*(.+)/);
      if (desMatch) {
        currentDes = {
          num: parseInt(desMatch[1], 10),
          puntos: desMatch[2] || "2,0 ptos",
          enunciado: desMatch[3].trim(),
          pautas: "",
          lineas: 6
        };
        preguntasDesarrollo.push(currentDes);
        continue;
      }

      if (line.startsWith('- Pautas:') || line.startsWith('- Pautes:')) {
        if (currentDes) {
          currentDes.pautas = line.substring(line.indexOf(':') + 1).trim();
        }
        continue;
      }
      if (line.startsWith('- Líneas:') || line.startsWith('- Línies:') || line.startsWith('[LÍNEAS:') || line.startsWith('[LINEAS:')) {
        const numM = line.match(/\d+/);
        if (numM && currentDes) {
          currentDes.lineas = parseInt(numM[0], 10);
        }
        continue;
      }
      if (line.startsWith('> «') || line.startsWith('> "') || line.startsWith('> 📖')) {
        if (currentDes) {
          currentDes.citaTexto = line.replace(/^>\s*/, '').trim();
        }
        continue;
      }
    }
  }

  // Si no se marcó ninguna opción como correcta, marcar la primera
  for (const q of preguntasTest) {
    if (!q.opciones.some(o => o.correcta) && q.opciones.length > 0) {
      q.opciones[0].correcta = true;
    }
  }

  return { titulo, subtitulo, curso, instrucciones, preguntasTest, preguntasDesarrollo };
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

  if (tipo === 'test') {
    return generateTipoTestTypst(data, isVa);
  } else if (tipo === 'mixto') {
    return generateMixtoTypst(data, isVa);
  } else {
    return generateDesarrolloTypst(data, isVa);
  }
}

// -------------------------------------------------------------
// 1. SOLUCIONARIO (1 Página exacta oficial)
// -------------------------------------------------------------
function generateSolucionarioTypst(data: any, tipo: ExamenTipo, isVa: boolean): string {
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";
  const titleSol = isVa ? "SOLUCIONARI OFICIAL DE L'EXAMEN" : "SOLUCIONARIO OFICIAL DEL EXAMEN";
  const refCode = `Ref: 2026-REL-${tipo.toUpperCase()}-SOL`;

  const respuestasTestTypst = data.preguntasTest.map((q: PreguntaTest) => {
    const optCorrecta = q.opciones.find(o => o.correcta) || q.opciones[0];
    const letra = optCorrecta ? optCorrecta.letra : "a";
    const texto = optCorrecta ? sanitizeTypst(optCorrecta.texto) : "";
    return `  #item-solucionario("${q.num}", "${letra}", "${texto}")`;
  }).join('\n');

  const desarrolloSolTypst = data.preguntasDesarrollo.length > 0 ? `
  #v(10pt)
  #line(length: 100%, stroke: 0.8pt + rgb("#CAD2C5"))
  #v(6pt)
  #text(10.5pt, weight: "bold", fill: rgb("#1E293B"))[${isVa ? "Criteris de qualificació per a la part de desenvolupament:" : "Criterios de calificación para la parte de desarrollo:"}]
  #v(4pt)
  ${data.preguntasDesarrollo.map((d: PreguntaDesarrollo) => `
    #block(fill: rgb("#F8FAFC"), inset: 8pt, radius: 4pt, stroke: 0.5pt + rgb("#CBD5E1"), spacing: 6pt)[
      #text(9.5pt, weight: "bold", fill: rgb("#334155"))[Qüestió ${d.num} (${d.puntos})]: #text(9.5pt)[${sanitizeTypst(d.enunciado)}]\\
      #if "${sanitizeTypst(d.pautas)}" != "" [
        #v(2pt)
        #text(8.5pt, fill: rgb("#64748B"), style: "italic")[Criteris clau: ${sanitizeTypst(d.pautas)}]
      ]
    ]
  `).join('\n')}
  ` : '';

  return `// SOLUCIONARIO OFICIAL (1 PÁGINA)
#set document(title: "${titleSol}", author: "Departamento de Religión")
#set page(
  paper: "a4",
  margin: (top: 1.2cm, bottom: 1.2cm, left: 1.3cm, right: 1.3cm),
  header-ascent: 0.3cm,
  footer-descent: 0.2cm,
  header: context [
    #grid(
      columns: (1fr, auto),
      align: (left + bottom, right + bottom),
      text(8pt, fill: rgb("#64748B"), font: "Helvetica Neue", weight: "bold")[${headerDept}],
      text(8pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "bold")[${titleSol}]
    )
    #v(2pt)
    #line(length: 100%, stroke: 0.5pt + rgb("#CBD5E1"))
  ],
  footer: context [
    #line(length: 100%, stroke: 0.5pt + rgb("#E2E8F0"))
    #v(2.5pt)
    #grid(
      columns: (1fr, 1fr, 1fr),
      align: (left, center, right),
      text(8pt, fill: rgb("#94A3B8"), font: "Helvetica Neue")[${refCode}],
      text(8pt, fill: rgb("#94A3B8"), font: "Helvetica Neue")[${headerDept}],
      text(8pt, fill: rgb("#94A3B8"), font: "Helvetica Neue")[Página #counter(page).display("1 de 1", both: true)]
    )
  ]
)

#set text(font: ("Helvetica Neue", "Arial", "sans-serif"), size: 10pt, fill: rgb("#1F2937"), lang: "${isVa ? 'ca' : 'es'}")

#let item-solucionario(num, letra, texto) = block(spacing: 5pt)[
  #grid(
    columns: (22pt, 18pt, 1fr),
    gutter: 4pt,
    align: (left + horizon, center + horizon, left + horizon),
    text(9.5pt, weight: "bold", fill: rgb("#1E293B"))[#num.],
    box(
      width: 14pt, height: 14pt, radius: 7pt,
      fill: rgb("#EFF6FF"), stroke: 0.6pt + rgb("#3B82F6"),
      align(center + horizon)[#text(8.5pt, weight: "bold", fill: rgb("#1D4ED8"))[#letra]]
    ),
    text(9.2pt, fill: rgb("#334155"))[#texto]
  )
]

#block(
  width: 100%,
  fill: rgb("#F1F5F9"),
  radius: 4pt,
  inset: (x: 12pt, y: 8pt),
  stroke: 0.6pt + rgb("#CBD5E1"),
  [
    #text(13pt, weight: "bold", fill: rgb("#1E293B"))[${titleSol}]\\
    #v(2pt)
    #text(9pt, fill: rgb("#475569"))[${sanitizeTypst(data.curso)} • ${sanitizeTypst(data.subtitulo)}]
  ]
)

#v(8pt)

#columns(2, gutter: 16pt)[
${respuestasTestTypst}
]

${desarrolloSolTypst}
`;
}

// -------------------------------------------------------------
// 2. MODALIDAD TIPO TEST (2 Páginas exactas)
// -------------------------------------------------------------
function generateTipoTestTypst(data: any, isVa: boolean): string {
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";
  const numQ = data.preguntasTest.length || 20;
  const puntosPorAcierto = (10 / numQ).toFixed(2).replace('.', ',');
  const instDefault = isVa
    ? `INSTRUCCIONS: Llig atentament cada qüestió. Marca amb una creu o cercle clar l'opció correcta per a cada enunciat. Cada encert suma ${puntosPorAcierto} punts. Les respostes incorrectes no penalitzen.`
    : `INSTRUCCIONES: Lee atentamente cada cuestión. Marca con una cruz o círculo claro la opción correcta para cada enunciado. Cada pregunta tiene una única respuesta válida. Calificación: 10 puntos (${puntosPorAcierto} puntos por acierto). Respuestas incorrectas no restan.`;
  const instruccionesText = data.instrucciones ? sanitizeTypst(data.instrucciones) : instDefault;

  const cleanInst = instruccionesText.replace(/^(?:INSTRUCCIONES|INSTRUCCIONS):\s*/i, '');

  const half = Math.ceil(data.preguntasTest.length / 2);
  const p1 = data.preguntasTest.slice(0, half);
  const p2 = data.preguntasTest.slice(half);

  const p1Mid = Math.ceil(p1.length / 2);
  const p1C1 = p1.slice(0, p1Mid);
  const p1C2 = p1.slice(p1Mid);

  const p2Mid = Math.ceil(p2.length / 2);
  const p2C1 = p2.slice(0, p2Mid);
  const p2C2 = p2.slice(p2Mid);

  function renderList(list: PreguntaTest[], spacing: string) {
    return list.map(q => {
      const a = q.opciones.find(o => o.letra === 'a')?.texto || '';
      const b = q.opciones.find(o => o.letra === 'b')?.texto || '';
      const c = q.opciones.find(o => o.letra === 'c')?.texto || '';
      const d = q.opciones.find(o => o.letra === 'd')?.texto || '';
      return `  #pregunta-test(\n    "${q.num}",\n    "${sanitizeTypst(q.enunciado)}",\n    "${sanitizeTypst(a)}",\n    "${sanitizeTypst(b)}",\n    "${sanitizeTypst(c)}",\n    "${sanitizeTypst(d)}",\n    spacing_bottom: ${spacing}\n  )`;
    }).join('\n\n');
  }

  return `// =============================================================================
// PLANTILLA OFICIAL DE EXAMEN - TIPO TEST (2 PÁGINAS EXACTAS)
// Departamento de Religión Católica
// =============================================================================

#set document(title: "Examen - Religión Católica", author: "Departamento de Religión")

#set page(
  paper: "a4",
  flipped: false,
  margin: (top: 1.0cm, bottom: 1.0cm, left: 1.25cm, right: 1.25cm),
  header-ascent: 0.25cm,
  footer-descent: 0.2cm,
  header: context {
    if counter(page).get().first() > 1 {
      text(size: 8pt, fill: rgb("#64748B"), font: "Helvetica Neue")[
        #grid(
          columns: (1fr, 1fr),
          align: (left, right),
          [#strong[${headerDept}]],
          [#strong[EXAMEN]]
        )
        #v(2pt)
        #line(length: 100%, stroke: 0.5pt + rgb("#CBD5E1"))
      ]
    }
  },
  footer: context {
    text(size: 8pt, fill: rgb("#94A3B8"), font: "Helvetica Neue")[
      #line(length: 100%, stroke: 0.5pt + rgb("#E2E8F0"))
      #v(2.5pt)
      #grid(
        columns: (1fr, 1fr, 1fr),
        align: (left, center, right),
        [Ref: 2026-REL-TEST],
        [${headerDept}],
        [Página #counter(page).display("1 de 1", both: true)]
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

#let opcion(letra, texto) = block(spacing: 4.5pt)[
  #grid(
    columns: (15.5pt, 1fr),
    gutter: 4.5pt,
    align: (top + center, top + left),
    badge(letra),
    par(leading: 0.38em, justify: false)[#text(size: 10.2pt, fill: rgb("#374151"))[#texto]]
  )
]

#let pregunta-test(num, enunciado, a, b, c, d, spacing_bottom: 8.5pt) = block(breakable: false, spacing: spacing_bottom)[
  #text(size: 10.8pt, fill: rgb("#1E3A8A"), weight: "bold")[#num.] #text(size: 10.8pt, weight: "bold", fill: rgb("#0F172A"))[#enunciado]
  #v(2.5pt)
  #opcion("a", a)
  #opcion("b", b)
  #opcion("c", c)
  #opcion("d", d)
]

// PÁGINA 1
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
    #text(size: 18pt, weight: "bold", fill: rgb("#0F172A"))[EXAMEN] \\
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

#v(3pt)

#columns(2, gutter: 18pt)[
${renderList(p1C1, "8.5pt")}
#colbreak()
${renderList(p1C2, "8.5pt")}
]

#pagebreak()

// PÁGINA 2
#v(6pt)
#columns(2, gutter: 18pt)[
${renderList(p2C1, "12pt")}
#colbreak()
${renderList(p2C2, "12pt")}
]
`;
}

// -------------------------------------------------------------
// 3. MODALIDAD MIXTO (P1: 10 Test, P2: 3 Desarrollo)
// -------------------------------------------------------------
function generateMixtoTypst(data: any, isVa: boolean): string {
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";
  const p1Test = data.preguntasTest.slice(0, 10);
  const p2Des = data.preguntasDesarrollo.length > 0 ? data.preguntasDesarrollo.slice(0, 3) : [
    { num: 1, puntos: "2,0 ptos", enunciado: "Explica el concepto teológico de 'Dignidad Humana' y sus consecuencias éticas.", pautas: "Fundamentación bíblica, valor inalienable y rechazo de la cultura del descarte.", lineas: 6 },
    { num: 2, puntos: "2,0 ptos", enunciado: "Lectura y comentario de texto bíblico o magisterial.", pautas: "Comprensión del pasaje y relación con el compromiso social.", lineas: 6 },
    { num: 3, puntos: "2,0 ptos", enunciado: "Dilema moral y compromiso social cristiano en el entorno cotidiano.", pautas: "Solidaridad, bien común y aplicación práctica.", lineas: 6 }
  ];

  function renderTestQuestions(list: PreguntaTest[]) {
    return list.map(q => {
      const a = q.opciones.find(o => o.letra === 'a')?.texto || '';
      const b = q.opciones.find(o => o.letra === 'b')?.texto || '';
      const c = q.opciones.find(o => o.letra === 'c')?.texto || '';
      const d = q.opciones.find(o => o.letra === 'd')?.texto || '';
      return `  #pregunta-test(\n    "${q.num}",\n    "${sanitizeTypst(q.enunciado)}",\n    "${sanitizeTypst(a)}",\n    "${sanitizeTypst(b)}",\n    "${sanitizeTypst(c)}",\n    "${sanitizeTypst(d)}"\n  )`;
    }).join('\n\n');
  }

  const desListTypst = p2Des.map((d: PreguntaDesarrollo) => `
// Pregunta ${d.num}
#block(breakable: false)[
  #grid(
    columns: (1fr, auto),
    [#text(size: 11.0pt, fill: rgb("#1E3A8A"), weight: "bold")[${d.num}.] #text(size: 11.0pt, weight: "bold", fill: rgb("#0F172A"))[${sanitizeTypst(d.enunciado)}]],
    [#text(size: 9.5pt, weight: "bold", fill: rgb("#2563EB"))[[${sanitizeTypst(d.puntos)}]]]
  )
  ${d.pautas ? `#v(3.5pt)\n  #text(size: 9.8pt, style: "italic", fill: rgb("#64748B"))[Pautas: ${sanitizeTypst(d.pautas)}]` : ''}
  #lineas-pautadas(${d.lineas || 6})
]
`).join('\n#v(16pt)\n');

  return `// =============================================================================
// PLANTILLA OFICIAL DE EXAMEN - MODELO MIXTO (TEST + DESARROLLO)
// Departamento de Religión Católica
// =============================================================================

#set document(title: "Examen Mixto - Religión Católica", author: "Departamento de Religión")

#set page(
  paper: "a4",
  flipped: false,
  margin: (top: 1.0cm, bottom: 1.0cm, left: 1.25cm, right: 1.25cm),
  header-ascent: 0.3cm,
  footer-descent: 0.2cm,
  header: context {
    if counter(page).get().first() > 1 {
      text(size: 8pt, fill: rgb("#64748B"), font: "Helvetica Neue")[
        #grid(
          columns: (1fr, 1fr),
          align: (left, right),
          [#strong[${headerDept}]],
          [#strong[EXAMEN MIXTO (PARTE II: DESARROLLO)]]
        )
        #v(2pt)
        #line(length: 100%, stroke: 0.5pt + rgb("#CBD5E1"))
      ]
    }
  },
  footer: context {
    text(size: 8pt, fill: rgb("#94A3B8"), font: "Helvetica Neue")[
      #line(length: 100%, stroke: 0.5pt + rgb("#E2E8F0"))
      #v(2.5pt)
      #grid(
        columns: (1fr, 1fr, 1fr),
        align: (left, center, right),
        [Ref: 2026-REL-MIX],
        [${headerDept}],
        [Página #counter(page).display("1 de 1", both: true)]
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

#set par(justify: false, leading: 0.46em)

// COMPONENTES GRÁFICOS
#let badge(letra) = box(
  width: 13pt,
  height: 13pt,
  radius: 6.5pt,
  stroke: 0.6pt + rgb("#94A3B8"),
  fill: rgb("#F8FAFC"),
  align(center + horizon)[#text(size: 8pt, weight: "bold", fill: rgb("#334155"))[#letra]]
)

#let opcion(letra, texto) = block(spacing: 4.5pt)[
  #grid(
    columns: (15.5pt, 1fr),
    gutter: 4.5pt,
    align: (top + center, top + left),
    badge(letra),
    par(leading: 0.38em, justify: false)[#text(size: 10.5pt, fill: rgb("#374151"))[#texto]]
  )
]

#let pregunta-test(num, enunciado, a, b, c, d, spacing_bottom: 10.5pt) = block(breakable: false, spacing: spacing_bottom)[
  #text(size: 11.0pt, fill: rgb("#1E3A8A"), weight: "bold")[#num.] #text(size: 11.0pt, weight: "bold", fill: rgb("#0F172A"))[#enunciado]
  #v(3.5pt)
  #opcion("a", a)
  #opcion("b", b)
  #opcion("c", c)
  #opcion("d", d)
]

#let lineas-pautadas(n, espaciado: 13.0pt) = block(spacing: 5pt)[
  #for _ in range(n) [
    #v(espaciado)
    #line(length: 100%, stroke: (paint: rgb("#CBD5E1"), thickness: 0.6pt, dash: "dotted"))
  ]
]

// PÁGINA 1: TEST
#grid(
  columns: (1fr,),
  align: left,
  [#text(size: 10.5pt, weight: "bold", tracking: 0.08em, fill: rgb("#1E293B"))[${headerDept}]]
)
#v(3pt)
#line(length: 100%, stroke: 1.5pt + rgb("#1E293B"))
#v(3pt)

#grid(
  columns: (1.1fr, 1fr),
  gutter: 16pt,
  [
    #text(size: 17pt, weight: "bold", fill: rgb("#0F172A"))[EXAMEN MIXTO] \\
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
  #text(size: 10.2pt, fill: rgb("#1E40AF"))[
    #strong[PARTE I: PREGUNTAS TIPO TEST (4,0 PUNTOS).] 10 cuestiones (0,40 ptos por acierto). Sin penalización.
  ]
]

#v(3.5pt)

#columns(2, gutter: 18pt)[
${renderTestQuestions(p1Test)}
]

#pagebreak()

// PÁGINA 2: DESARROLLO
#v(4pt)
#block(
  fill: rgb("#F1F5F9"),
  inset: (x: 8pt, y: 4.5pt),
  radius: 3pt,
  width: 100%
)[
  #text(weight: "bold", size: 10.5pt, fill: rgb("#0F172A"))[PARTE II: PREGUNTAS DE DESARROLLO Y RAZONAMIENTO (Valor total: 6,0 puntos — 2,0 ptos cada cuestión)]
]

#v(10pt)

${desListTypst}
`;
}

// -------------------------------------------------------------
// 4. MODALIDAD DESARROLLO (4 Bloques en 2 Páginas)
// -------------------------------------------------------------
function generateDesarrolloTypst(data: any, isVa: boolean): string {
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";
  const items = data.preguntasDesarrollo.length >= 4 ? data.preguntasDesarrollo : [
    { num: 1, puntos: "3,0 ptos", enunciado: "CONCEPTOS CLAVE Y FUNDAMENTACIÓN DOCTRINAL: La dignidad humana frente a la cultura del descarte y el utilitarismo.", pautas: "Define el concepto de dignidad como valor intrínseco e inalienable derivado de la creación a imagen de Dios.", lineas: 8 },
    { num: 2, puntos: "2,5 ptos", enunciado: "ANÁLISIS Y COMENTARIO DE TEXTO: Comentario de la encíclica social «Gaudium et Spes», n. 24.", pautas: "Explica el significado teológico de ser amado 'por sí mismo' y relacionalo con la regla de oro.", lineas: 8 },
    { num: 3, puntos: "2,5 ptos", enunciado: "DOCTRINA SOCIAL Y BIEN COMÚN: El destino universal de los bienes y la función social de la propiedad.", pautas: "Expón por qué los recursos creados pertenecen originariamente a toda la humanidad y explica la hipoteca social.", lineas: 8 },
    { num: 4, puntos: "2,0 ptos", enunciado: "APLICACIÓN PRÁCTICA Y COMPROMISO: Juicio moral y consumo responsable en la vida cotidiana.", pautas: "Analiza el impacto del consumo en los vulnerables y propón compromisos cristianos coherentes.", lineas: 8 }
  ];

  const p1 = items.slice(0, 2);
  const p2 = items.slice(2);

  function renderDesBlocks(list: PreguntaDesarrollo[], startIdx: number) {
    return list.map((d, i) => {
      const blockNum = startIdx + i;
      return `
#seccion[BLOQUE ${blockNum}: ${sanitizeTypst(d.enunciado)} (Valor: ${sanitizeTypst(d.puntos)})]
#v(4pt)
#block(breakable: false)[
  ${d.pautas ? `#text(size: 9.8pt, style: "italic", fill: rgb("#64748B"))[Criterios / Pautas: ${sanitizeTypst(d.pautas)}]\n  #v(2.5pt)` : ''}
  #lineas-pautadas(${d.lineas || 8})
]
`;
    }).join('\n#v(14pt)\n');
  }

  return `// =============================================================================
// PLANTILLA OFICIAL DE EXAMEN - MODELO DE DESARROLLO COMPLETO
// Departamento de Religión Católica (2 Páginas Exactas)
// =============================================================================

#set document(title: "Examen de Desarrollo - Religión Católica", author: "Departamento de Religión")

#set page(
  paper: "a4",
  flipped: false,
  margin: (top: 1.0cm, bottom: 1.0cm, left: 1.25cm, right: 1.25cm),
  header-ascent: 0.25cm,
  footer-descent: 0.2cm,
  header: context {
    if counter(page).get().first() > 1 {
      text(size: 8pt, fill: rgb("#64748B"), font: "Helvetica Neue")[
        #grid(
          columns: (1fr, 1fr),
          align: (left, right),
          [#strong[${headerDept}]],
          [#strong[EXAMEN DE DESARROLLO (CONTINUACIÓN)]]
        )
        #v(2pt)
        #line(length: 100%, stroke: 0.5pt + rgb("#CBD5E1"))
      ]
    }
  },
  footer: context {
    text(size: 8pt, fill: rgb("#94A3B8"), font: "Helvetica Neue")[
      #line(length: 100%, stroke: 0.5pt + rgb("#E2E8F0"))
      #v(2.5pt)
      #grid(
        columns: (1fr, 1fr, 1fr),
        align: (left, center, right),
        [Ref: 2026-REL-DES],
        [${headerDept}],
        [Página #counter(page).display("1 de 1", both: true)]
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

#set par(justify: false, leading: 0.48em)

#let lineas-pautadas(n, espaciado: 13.0pt) = block(spacing: 5pt)[
  #for _ in range(n) [
    #v(espaciado)
    #line(length: 100%, stroke: (paint: rgb("#CBD5E1"), thickness: 0.6pt, dash: "dotted"))
  ]
]

#let seccion(titulo) = block(
  width: 100%,
  fill: rgb("#F1F5F9"),
  inset: (x: 8pt, y: 5pt),
  radius: 3pt,
  spacing: 8pt
)[
  #text(weight: "bold", size: 10.5pt, fill: rgb("#0F172A"))[#titulo]
]

// PÁGINA 1
#grid(
  columns: (1fr,),
  align: left,
  [#text(size: 10.5pt, weight: "bold", tracking: 0.08em, fill: rgb("#1E293B"))[${headerDept}]]
)
#v(3pt)
#line(length: 100%, stroke: 1.5pt + rgb("#1E293B"))
#v(3pt)

#grid(
  columns: (1.1fr, 1fr),
  gutter: 16pt,
  [
    #text(size: 17pt, weight: "bold", fill: rgb("#0F172A"))[EXAMEN DE DESARROLLO] \\
    #v(2pt)
    #text(size: 10.5pt, style: "italic", fill: rgb("#475569"))[${sanitizeTypst(data.subtitulo)}]
  ],
  [
    #set text(size: 8.5pt)
    #rect(width: 100%, stroke: 0.6pt + rgb("#CBD5E1"), radius: 4pt, inset: 6.5pt, fill: rgb("#F8FAFC"))[
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

#v(3pt)
#line(length: 100%, stroke: 0.6pt + rgb("#E2E8F0"))
#v(3pt)

#rect(
  width: 100%,
  stroke: 0.6pt + rgb("#BFDBFE"),
  radius: 3pt,
  inset: (x: 8pt, y: 4.5pt),
  fill: rgb("#EFF6FF")
)[
  #text(size: 9.8pt, fill: rgb("#1E40AF"))[
    #strong[CRITERIOS DE CALIFICACIÓN:] Se valorará la claridad expositiva, la precisión teológica y conceptual, la argumentación coherente a partir de fuentes cristianas y la corrección ortográfica. Puntuación máxima: 10 puntos.
  ]
]

#v(6pt)

${renderDesBlocks(p1, 1)}

#pagebreak()

// PÁGINA 2
#v(4pt)
${renderDesBlocks(p2, 3)}
`;
}
