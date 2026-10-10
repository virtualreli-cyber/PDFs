import type { Language, FontSizesConfig } from '../types';

export interface TareaActividad {
  num: number;
  titulo: string;
  sesion: string;
  tipo: string;
  instrucciones?: string;
  fuenteTitulo?: string;
  fuenteTexto?: string;
  preguntas: { num: number; texto: string; lineas: number }[];
}

export function parseTareasMarkdown(markdown: string, isVa: boolean = false) {
  let curso = isVa ? "2n ESO" : "2º ESO";
  let asignatura = isVa ? "RELIGIÓ CATÒLICA" : "RELIGIÓN CATÓLICA";
  let tituloTema = isVa ? "HISTÒRIA DE L'ESGLÉSIA PRIMITIVA: MISSIÓ I TESTIMONI" : "HISTORIA DE LA IGLESIA PRIMITIVA: MISIÓN Y TESTIMONIO";
  const actividades: TareaActividad[] = [];

  const lines = markdown.split('\n');
  let currentAct: TareaActividad | null = null;
  let inFuente = false;
  let fuenteLines: string[] = [];
  let currentQ: { num: number; texto: string; lineas: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('# ASIGNATURA:')) {
      asignatura = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }
    if (line.startsWith('# CURSO:') || line.startsWith('# CURS:')) {
      curso = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }
    if (line.startsWith('# TÍTULO:') || line.startsWith('# TITULO:') || line.startsWith('# TÍTOL:')) {
      tituloTema = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }

    // Nueva actividad
    const actMatch = line.match(/^##\s*(?:ACTIVIDAD|ACTIVITAT|SESIÓN|SESSIÓ)\s*(\d+)[:\.-]?\s*(.*)/i);
    if (actMatch) {
      if (currentAct && inFuente && fuenteLines.length > 0) {
        currentAct.fuenteTexto = fuenteLines.join(' ');
        inFuente = false;
        fuenteLines = [];
      }
      currentAct = {
        num: parseInt(actMatch[1], 10),
        titulo: actMatch[2].trim() || (isVa ? `Activitat ${actMatch[1]}` : `Actividad ${actMatch[1]}`),
        sesion: actMatch[1],
        tipo: isVa ? "Portfoli" : "Portfolio",
        preguntas: []
      };
      actividades.push(currentAct);
      currentQ = null;
      continue;
    }

    if (currentAct) {
      if (line.startsWith('- Sesión:') || line.startsWith('- Sessió:')) {
        currentAct.sesion = line.substring(line.indexOf(':') + 1).trim();
        continue;
      }
      if (line.startsWith('- Tipo:') || line.startsWith('- Tipus:')) {
        currentAct.tipo = line.substring(line.indexOf(':') + 1).trim();
        continue;
      }
      if (line.startsWith('- Instrucciones:') || line.startsWith('- Instruccions:')) {
        currentAct.instrucciones = line.substring(line.indexOf(':') + 1).trim();
        continue;
      }

      // Cajas de texto / Fuentes
      if (line.startsWith('> 📜') || line.startsWith('> **[FUENTE') || line.startsWith('> **[FONT') || line.startsWith('> **[DOCUMENT') || line.startsWith('> 📖')) {
        const headerMatch = line.match(/\*\*\[?(.*?)\]?\*\*:?\s*(.*)/);
        if (headerMatch) {
          currentAct.fuenteTitulo = headerMatch[2] || (isVa ? "DOCUMENT HISTÒRIC" : "DOCUMENTO HISTÓRICO");
        }
        inFuente = true;
        fuenteLines = [];
        continue;
      }
      if (inFuente) {
        if (line.startsWith('>')) {
          fuenteLines.push(line.replace(/^>\s*/, ''));
          continue;
        } else {
          currentAct.fuenteTexto = fuenteLines.join(' ');
          inFuente = false;
        }
      }

      // Preguntas
      const qMatch = line.match(/^(\d+)[\.\)]\s*(.+)/);
      if (qMatch) {
        currentQ = {
          num: parseInt(qMatch[1], 10),
          texto: qMatch[2].trim(),
          lineas: 4
        };
        currentAct.preguntas.push(currentQ);
        continue;
      }

      // Líneas para la pregunta actual
      const linesMatch = line.match(/\[(?:LÍNEAS|LINEAS|LÍNIES):\s*(\d+)\]/i);
      if (linesMatch && currentQ) {
        currentQ.lineas = parseInt(linesMatch[1], 10);
        continue;
      }
    }
  }

  if (currentAct && inFuente && fuenteLines.length > 0) {
    currentAct.fuenteTexto = fuenteLines.join(' ');
  }

  return { curso, asignatura, tituloTema, actividades };
}

function sanitizeForTypst(text: string): string {
  if (!text) return "";
  return text
    .replace(/"/g, '\\"')
    .replace(/<(?=[0-9a-zA-Z_%])/g, '\\<');
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
    const preguntasTypst = act.preguntas.map(q => `
  #seccion-pregunta("${q.num}", [${sanitizeForTypst(q.texto)}])
  #v(2.5pt)
  #pauta-lineas(${q.lineas || 4})
`).join('\n');

    const fuenteBlock = act.fuenteTexto ? `
  #caja-instrucciones(
    titulo: "${sanitizeForTypst(act.fuenteTitulo || (isVa ? "DOCUMENT HISTÒRIC" : "DOCUMENTO HISTÓRICO"))}",
    cuerpo: [${sanitizeForTypst(act.fuenteTexto)}]
  )
  #v(5pt)
` : '';

    const instrBlock = act.instrucciones ? `
  #text(size: 9.8pt, fill: rgb("#475569"), style: "italic")[${sanitizeForTypst(act.instrucciones)}]
  #v(3pt)
` : '';

    return `
// PÁGINA ACTIVIDAD ${act.num}
#franja-alumno()
#banner-actividad("${act.num}", "${sanitizeForTypst(act.titulo)}", sesion: "${sanitizeForTypst(act.sesion)}", tipo: "${sanitizeForTypst(act.tipo)}")
${instrBlock}${fuenteBlock}${preguntasTypst}
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
      columns: (1fr, auto),
      align: (left + bottom, right + bottom),
      text(8.8pt, fill: rgb("#52796F"), font: "Helvetica Neue", weight: "bold")[${headerLeft}],
      text(8.8pt, fill: rgb("#D08C51"), font: "Helvetica Neue", weight: "bold")[${headerRight}]
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

#let banner-actividad(numero, titulo, sesion: "", tipo: "Portfolio") = block(breakable: false, width: 100%, spacing: 8pt)[
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
        #text(size: 9pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#52796F"))[${isVa ? "ACTIVITAT" : "ACTIVIDAD"} #numero] \\
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
                #badge("${isVa ? "SESSIÓ " : "SESIÓN "}" + str(sesion), bg: rgb("#E0E7FF"), border: rgb("#A5B4FC"), color: rgb("#3730A3"))
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

#let caja-instrucciones(titulo: "${isVa ? "INSTRUCCIONS" : "INSTRUCCIONES"}", cuerpo: []) = block(breakable: false, width: 100%, spacing: 8pt)[
  #rect(
    width: 100%,
    fill: rgb("#F8FAFC"),
    stroke: (left: 3pt + rgb("#94A3B8"), rest: 0.5pt + rgb("#E2E8F0")),
    radius: (right: 4pt),
    inset: (x: 10pt, y: 7pt)
  )[
    #text(size: 8.5pt, font: "Helvetica Neue", weight: "bold", fill: rgb("#475569"))[#titulo]\\
    #v(2pt)
    #text(size: ${(contenido * 0.91).toFixed(1)}pt, font: "Georgia", style: "italic", fill: rgb("#334155"))[#cuerpo]
  ]
]

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
