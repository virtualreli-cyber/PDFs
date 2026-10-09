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
      // Pregunta test número: "1. ¿Enunciado?" o "1) ¿Enunciado?"
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

      // Opción: "a) ...", "*a) ...", "(a) ..."
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
      // Pregunta de desarrollo
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

  // Si no se marcó ninguna opción como correcta, poner por defecto la primera para el solucionario
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
// 1. SOLUCIONARIO (1 Página limpia oficial)
// -------------------------------------------------------------
function generateSolucionarioTypst(data: any, tipo: ExamenTipo, isVa: boolean): string {
  const headerDept = isVa ? "DEPARTAMENT DE RELIGIÓ CATÒLICA" : "DEPARTAMENTO DE RELIGIÓN CATÓLICA";
  const titleSol = isVa ? "SOLUCIONARI OFICIAL DE L'EXAMEN" : "SOLUCIONARIO OFICIAL DEL EXAMEN";
  const refCode = `Ref: 2026-REL-${tipo.toUpperCase()}-SOL`;

  const respuestasTestTypst = data.preguntasTest.map((q: PreguntaTest) => {
    const optCorrecta = q.opciones.find(o => o.correcta) || q.opciones[0];
    const letra = optCorrecta ? optCorrecta.letra : "a";
    const texto = optCorrecta ? optCorrecta.texto.replace(/"/g, '\\"') : "";
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
      #text(9.5pt, weight: "bold", fill: rgb("#334155"))[Qüestió ${d.num} (${d.puntos})]: #text(9.5pt)[${d.enunciado.replace(/"/g, '\\"')}]\\
      #if "${d.pautas}" != "" [
        #v(2pt)
        #text(8.5pt, fill: rgb("#64748B"), style: "italic")[Criteris clau: ${d.pautas.replace(/"/g, '\\"')}]
      ]
    ]
  `).join('\n')}
  ` : '';

  return `// SOLUCIONARIO OFICIAL
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
    columns: (24pt, 20pt, 1fr),
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
    #text(9pt, fill: rgb("#475569"))[${data.curso} • ${data.subtitulo}]
  ]
)

#v(8pt)

#columns(2, gutter: 14pt)[
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
    ? `INSTRUCCIONS: Llig atentament cada qüestió. Marca amb una creu o cercle clar l'opció correcta (a, b, c, d). Cada encert suma ${puntosPorAcierto} punts. Les respostes errònies no descompten.`
    : `INSTRUCCIONES: Lee atentamente cada cuestión. Marca con una cruz o círculo claro la opción correcta (a, b, c, d). Cada acierto suma ${puntosPorAcierto} puntos. Las respuestas erróneas no restan.`;
  const instruccionesText = data.instrucciones || instDefault;

  // Dividir preguntas equitativamente entre las 2 páginas
  const half = Math.ceil(data.preguntasTest.length / 2);
  const p1 = data.preguntasTest.slice(0, half);
  const p2 = data.preguntasTest.slice(half);

  function renderList(list: PreguntaTest[]) {
    return list.map(q => {
      const opcionesTypst = q.opciones.map(o => `    opcion("${o.letra}", [${o.texto.replace(/"/g, '\\')}])`).join(',\n');
      return `  pregunta-test("${q.num}", [${q.enunciado.replace(/"/g, '\\')}], (\n${opcionesTypst}\n  ))`;
    }).join(',\n');
  }

  return `// EXAMEN TIPO TEST (2 PÁGINAS EXACTAS)
#set document(title: "Examen Tipo Test", author: "Departamento de Religión")
#set page(
  paper: "a4",
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

#set text(font: ("Helvetica Neue", "Arial", "sans-serif"), size: 10.5pt, fill: rgb("#1F2937"), lang: "${isVa ? 'ca' : 'es'}")
#set par(justify: false, leading: 0.44em)

#let badge(letra) = box(
  width: 13pt, height: 13pt, radius: 6.5pt,
  stroke: 0.6pt + rgb("#94A3B8"), fill: rgb("#F8FAFC"),
  align(center + horizon)[#text(size: 8pt, weight: "bold", fill: rgb("#334155"))[#letra]]
)

#let opcion(letra, texto) = block(spacing: 4.8pt)[
  #grid(
    columns: (15.5pt, 1fr),
    gutter: 4.5pt,
    align: (top + center, top + left),
    badge(letra),
    text(size: 10.8pt, fill: rgb("#334155"))[#texto]
  )
]

#let pregunta-test(num, enunciado, opciones) = block(breakable: false, spacing: 10pt)[
  #text(size: 11.2pt, weight: "bold", fill: rgb("#1E293B"))[#num. #enunciado]
  #v(4pt)
  #for op in opciones [
    #op
  ]
]

// PÁGINA 1
#text(size: 8.5pt, weight: "bold", fill: rgb("#475569"))[${headerDept}]
#v(2pt)
#line(length: 100%, stroke: 1.5pt + rgb("#1E293B"))
#v(6pt)

#grid(
  columns: (1.5fr, 1fr),
  gutter: 14pt,
  [
    #text(size: 17pt, weight: "extrabold", fill: rgb("#1E293B"))[EXAMEN] \\
    #v(2pt)
    #text(size: 9.8pt, weight: "bold", fill: rgb("#475569"))[${data.subtitulo}]
  ],
  [
    #rect(
      width: 100%, stroke: 0.6pt + rgb("#CBD5E1"), radius: 4pt, fill: rgb("#F8FAFC"), inset: 6pt,
      [
        #text(size: 8.5pt, weight: "bold", fill: rgb("#64748B"))[${isVa ? "ALUMNE/A:" : "ALUMNO/A:"}] #line(length: 100%, stroke: 0.4pt + rgb("#CBD5E1"))
        #v(3pt)
        #grid(
          columns: (1fr, 1.2fr),
          [#text(size: 8.5pt, weight: "bold", fill: rgb("#64748B"))[${isVa ? "CURS:" : "CURSO:"}] ${data.curso}],
          [#text(size: 8.5pt, weight: "bold", fill: rgb("#64748B"))[${isVa ? "DATA:" : "FECHA:"}] #line(length: 60%, stroke: 0.4pt + rgb("#CBD5E1"))]
        )
      ]
    )
  ]
)

#v(5pt)
#rect(
  width: 100%, fill: rgb("#EFF6FF"), stroke: 0.5pt + rgb("#BFDBFE"), radius: 3pt, inset: (x: 8pt, y: 5pt),
  text(size: 10.2pt, fill: rgb("#1E40AF"))[#strong[${instruccionesText}]]
)
#v(6pt)

#columns(2, gutter: 14pt)[
${renderList(p1)}
]

#pagebreak()

// PÁGINA 2
#v(4pt)
#columns(2, gutter: 14pt)[
${renderList(p2)}
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
    { num: 1, puntos: "2,0 ptos", enunciado: "Define el concepto fundamental analizado en la unidad y explica su relevancia para la ética cristiana.", pautas: "Claridad conceptual, vocabulario teológico y justificación moral.", lineas: 6 },
    { num: 2, puntos: "2,0 ptos", enunciado: "Analiza el texto bíblico o magisterial propuesto y extrae dos conclusiones directas.", pautas: "Comprensión del pasaje y relación con el tema.", lineas: 6 },
    { num: 3, puntos: "2,0 ptos", enunciado: "Aplica los principios estudiados a un dilema actual de la vida social o escolar.", pautas: "Propuestas de compromiso y razonamiento constructivo.", lineas: 6 }
  ];

  const testListTypst = p1Test.map((q: PreguntaTest) => {
    const opcionesTypst = q.opciones.map(o => `    opcion("${o.letra}", [${o.texto.replace(/"/g, '\\')}])`).join(',\n');
    return `  pregunta-test("${q.num}", [${q.enunciado.replace(/"/g, '\\')}], (\n${opcionesTypst}\n  ))`;
  }).join(',\n');

  const desListTypst = p2Des.map((d: PreguntaDesarrollo) => `
  #pregunta-desarrollo(
    "${d.num}",
    "${d.puntos}",
    [${d.enunciado.replace(/"/g, '\\')}],
    "${d.pautas.replace(/"/g, '\\')}",
    ${d.lineas}
  )
  `).join('\n');

  return `// EXAMEN MIXTO (P1: TEST, P2: DESARROLLO)
#set document(title: "Examen Mixto", author: "Departamento de Religión")
#set page(
  paper: "a4",
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

#set text(font: ("Helvetica Neue", "Arial", "sans-serif"), size: 10.5pt, fill: rgb("#1F2937"), lang: "${isVa ? 'ca' : 'es'}")
#set par(justify: false, leading: 0.46em)

#let badge(letra) = box(
  width: 13pt, height: 13pt, radius: 6.5pt,
  stroke: 0.6pt + rgb("#94A3B8"), fill: rgb("#F8FAFC"),
  align(center + horizon)[#text(size: 8pt, weight: "bold", fill: rgb("#334155"))[#letra]]
)

#let opcion(letra, texto) = block(spacing: 4.5pt)[
  #grid(
    columns: (15.5pt, 1fr),
    gutter: 4.5pt,
    align: (top + center, top + left),
    badge(letra),
    text(size: 10.8pt, fill: rgb("#334155"))[#texto]
  )
]

#let pregunta-test(num, enunciado, opciones) = block(breakable: false, spacing: 9pt)[
  #text(size: 11.2pt, weight: "bold", fill: rgb("#1E293B"))[#num. #enunciado]
  #v(3.5pt)
  #for op in opciones [
    #op
  ]
]

#let lineas-pautadas(n, espaciado: 12.5pt) = block(spacing: 5pt)[
  #for _ in range(n) [
    #v(espaciado)
    #line(length: 100%, stroke: (paint: rgb("#CBD5E1"), thickness: 0.6pt, dash: "dotted"))
  ]
]

#let pregunta-desarrollo(num, puntos, enunciado, pautas, lineas) = block(breakable: false, spacing: 14pt)[
  #grid(
    columns: (1fr, auto),
    text(size: 11.2pt, weight: "bold", fill: rgb("#1E293B"))[#num. #enunciado],
    box(fill: rgb("#EFF6FF"), inset: (x: 5pt, y: 2pt), radius: 3pt, text(size: 8.5pt, weight: "bold", fill: rgb("#1E40AF"))[#puntos])
  )
  #if pautas != "" [
    #v(2.5pt)
    #text(size: 9.8pt, fill: rgb("#64748B"), style: "italic")[Pautas: #pautas]
  ]
  #v(4pt)
  #lineas-pautadas(lineas)
]

// PÁGINA 1: TEST
#text(size: 8.5pt, weight: "bold", fill: rgb("#475569"))[${headerDept}]
#v(2pt)
#line(length: 100%, stroke: 1.5pt + rgb("#1E293B"))
#v(6pt)

#grid(
  columns: (1.5fr, 1fr),
  gutter: 14pt,
  [
    #text(size: 17pt, weight: "extrabold", fill: rgb("#1E293B"))[EXAMEN MIXTO] \\
    #v(2pt)
    #text(size: 9.8pt, weight: "bold", fill: rgb("#475569"))[${data.subtitulo}]
  ],
  [
    #rect(
      width: 100%, stroke: 0.6pt + rgb("#CBD5E1"), radius: 4pt, fill: rgb("#F8FAFC"), inset: 6pt,
      [
        #text(size: 8.5pt, weight: "bold", fill: rgb("#64748B"))[${isVa ? "ALUMNE/A:" : "ALUMNO/A:"}] #line(length: 100%, stroke: 0.4pt + rgb("#CBD5E1"))
        #v(3pt)
        #grid(
          columns: (1fr, 1.2fr),
          [#text(size: 8.5pt, weight: "bold", fill: rgb("#64748B"))[${isVa ? "CURS:" : "CURSO:"}] ${data.curso}],
          [#text(size: 8.5pt, weight: "bold", fill: rgb("#64748B"))[${isVa ? "DATA:" : "FECHA:"}] #line(length: 60%, stroke: 0.4pt + rgb("#CBD5E1"))]
        )
      ]
    )
  ]
)

#v(5pt)
#rect(
  width: 100%, fill: rgb("#EFF6FF"), stroke: 0.5pt + rgb("#BFDBFE"), radius: 3pt, inset: (x: 8pt, y: 5pt),
  text(size: 10.2pt, fill: rgb("#1E40AF"))[#strong[PARTE I: TEST (4,0 PUNTOS). 10 preguntas (0,40 ptos por acierto). Sin penalización.]]
)
#v(6pt)

#columns(2, gutter: 14pt)[
${testListTypst}
]

#pagebreak()

// PÁGINA 2: DESARROLLO
#rect(
  width: 100%, fill: rgb("#F8FAFC"), stroke: 0.5pt + rgb("#CBD5E1"), radius: 3pt, inset: (x: 8pt, y: 5pt),
  text(size: 10.2pt, fill: rgb("#334155"))[#strong[PARTE II: DESARROLLO Y RAZONAMIENTO (6,0 PUNTOS). Responde con claridad en el espacio pautado.]]
)
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
    { num: 1, puntos: "3,0 ptos", enunciado: "Conceptos clave y vocabulario fundamental de la unidad.", pautas: "Define con precisión los términos nucleares y su fundamentación cristiana.", lineas: 8 },
    { num: 2, puntos: "2,5 ptos", enunciado: "Análisis y comentario de texto bíblico o magisterial.", pautas: "Identifica la idea principal y relaciónala con la enseñanza de la Iglesia.", lineas: 8 },
    { num: 3, puntos: "2,5 ptos", enunciado: "Desarrollo temático y síntesis conceptual.", pautas: "Estructura la respuesta de forma lógica, clara y argumentada.", lineas: 8 },
    { num: 4, puntos: "2,0 ptos", enunciado: "Aplicación moral, dilema ético y compromiso cristiano en la vida cotidiana.", pautas: "Propón acciones coherentes y fundamenta tu juicio moral.", lineas: 8 }
  ];

  const p1 = items.slice(0, 2);
  const p2 = items.slice(2);

  function renderDesList(list: PreguntaDesarrollo[]) {
    return list.map(d => `
    #pregunta-desarrollo(
      "${d.num}",
      "${d.puntos}",
      [${d.enunciado.replace(/"/g, '\\')}],
      "${d.pautas.replace(/"/g, '\\')}",
      ${d.lineas || 8}
    )
    `).join('\n');
  }

  return `// EXAMEN DE DESARROLLO COMPLETO (2 PÁGINAS EXACTAS)
#set document(title: "Examen de Desarrollo", author: "Departamento de Religión")
#set page(
  paper: "a4",
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

#set text(font: ("Helvetica Neue", "Arial", "sans-serif"), size: 10.5pt, fill: rgb("#1F2937"), lang: "${isVa ? 'ca' : 'es'}")
#set par(justify: false, leading: 0.48em)

#let lineas-pautadas(n, espaciado: 13.0pt) = block(spacing: 6pt)[
  #for _ in range(n) [
    #v(espaciado)
    #line(length: 100%, stroke: (paint: rgb("#CBD5E1"), thickness: 0.6pt, dash: "dotted"))
  ]
]

#let pregunta-desarrollo(num, puntos, enunciado, pautas, lineas) = block(breakable: false, spacing: 16pt)[
  #grid(
    columns: (1fr, auto),
    text(size: 11.2pt, weight: "bold", fill: rgb("#1E293B"))[BLOQUE #num: #enunciado],
    box(fill: rgb("#EFF6FF"), inset: (x: 6pt, y: 2.5pt), radius: 3pt, text(size: 9pt, weight: "bold", fill: rgb("#1E40AF"))[#puntos])
  )
  #if pautas != "" [
    #v(3pt)
    #text(size: 9.8pt, fill: rgb("#64748B"), style: "italic")[Criterios / Pautas: #pautas]
  ]
  #v(4pt)
  #lineas-pautadas(lineas)
]

// PÁGINA 1
#text(size: 8.5pt, weight: "bold", fill: rgb("#475569"))[${headerDept}]
#v(2pt)
#line(length: 100%, stroke: 1.5pt + rgb("#1E293B"))
#v(6pt)

#grid(
  columns: (1.5fr, 1fr),
  gutter: 14pt,
  [
    #text(size: 16pt, weight: "extrabold", fill: rgb("#1E293B"))[EXAMEN DE DESARROLLO] \\
    #v(2pt)
    #text(size: 9.8pt, weight: "bold", fill: rgb("#475569"))[${data.subtitulo}]
  ],
  [
    #rect(
      width: 100%, stroke: 0.6pt + rgb("#CBD5E1"), radius: 4pt, fill: rgb("#F8FAFC"), inset: 6pt,
      [
        #text(size: 8.5pt, weight: "bold", fill: rgb("#64748B"))[${isVa ? "ALUMNE/A:" : "ALUMNO/A:"}] #line(length: 100%, stroke: 0.4pt + rgb("#CBD5E1"))
        #v(3pt)
        #grid(
          columns: (1fr, 1.2fr),
          [#text(size: 8.5pt, weight: "bold", fill: rgb("#64748B"))[${isVa ? "CURS:" : "CURSO:"}] ${data.curso}],
          [#text(size: 8.5pt, weight: "bold", fill: rgb("#64748B"))[${isVa ? "DATA:" : "FECHA:"}] #line(length: 60%, stroke: 0.4pt + rgb("#CBD5E1"))]
        )
      ]
    )
  ]
)

#v(5pt)
#rect(
  width: 100%, fill: rgb("#EFF6FF"), stroke: 0.5pt + rgb("#BFDBFE"), radius: 3pt, inset: (x: 8pt, y: 5pt),
  text(size: 10.2pt, fill: rgb("#1E40AF"))[#strong[INSTRUCCIONES: Redacta tus respuestas con orden, claridad y corrección ortográfica en las líneas asignadas.]]
)
#v(8pt)

${renderDesList(p1)}

#pagebreak()

// PÁGINA 2
#v(4pt)
${renderDesList(p2)}
`;
}
