// =============================================================================
// UTILIDAD DE ALEATORIZACIÓN Y GESTIÓN DE VERSIONES DE EXÁMENES
// =============================================================================

export interface TestOption {
  letra: string;
  texto: string;
  correcta: boolean;
}

export interface TestQuestion {
  num: number;
  enunciado: string;
  opciones: TestOption[];
  rawLines?: string[];
}

// Algoritmo Fisher-Yates para barajar arrays
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Baraja asegurando que el orden resultante sea distinto si hay al menos 2 elementos
function shuffleDistinct<T>(array: T[], compareKey?: (item: T) => any): T[] {
  if (array.length <= 1) return [...array];
  let shuffled = shuffleArray(array);
  
  // Si por azar resulta idéntico, rotar al menos 1 posición
  let isIdentical = true;
  for (let i = 0; i < array.length; i++) {
    const a = compareKey ? compareKey(array[i]) : array[i];
    const b = compareKey ? compareKey(shuffled[i]) : shuffled[i];
    if (a !== b) {
      isIdentical = false;
      break;
    }
  }
  
  if (isIdentical && array.length > 1) {
    shuffled = [...array.slice(1), array[0]];
  }
  return shuffled;
}

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * Parsea el Markdown de examen para extraer:
 * - Líneas de cabecera previas a las preguntas
 * - Lista estructurada de preguntas tipo test
 * - Líneas intermedias / desarrollo
 * - Solucionario final
 */
export function extractExamenQuestions(markdown: string) {
  const lines = markdown.split('\n');
  const headerLines: string[] = [];
  const testQuestions: TestQuestion[] = [];
  const middleOrDesarrolloLines: string[] = [];
  const solucionarioKeys = new Map<number, string>();
  let inSolucionario = false;

  let i = 0;
  let currentQ: TestQuestion | null = null;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Detección de bloque solucionario (Castellano y Valenciano)
    const cleanHeader = trimmed.replace(/^#+\s*|\*{2,}|_{2,}/g, '').replace(/\*{2,}|_{2,}$/g, '').trim();
    if (/^(?:SOLUCIONARIO|SOLUCIONARI|SOLUCIONS|SOLUCIONES|CLAVE DE RESPUESTAS|CLAU DE RESPOSTES|CLAU DE CORRECCI[ÓO]|CLAVE DE CORRECCI[ÓO]N|RESPUESTAS CORRECTAS|RESPOSTES CORRECTES|RESPUESTAS|RESPOSTES|CLAVE|CLAU)\b/i.test(cleanHeader)) {
      if (currentQ) {
        testQuestions.push(currentQ);
        currentQ = null;
      }
      inSolucionario = true;
      i++;
      continue;
    }

    if (inSolucionario) {
      const solMatch = trimmed.match(/^(?:[-*•]\s*)?\*?(\d+)(?:[\.\):]|\s+-\s*|\s+)\s*[\(\[\*]?([a-dA-D])[\)\]\.\:\-\*]?/);
      if (solMatch) {
        const qNum = parseInt(solMatch[1], 10);
        const letra = solMatch[2].toLowerCase();
        solucionarioKeys.set(qNum, letra);
      }
      i++;
      continue;
    }

    // Cabecera de preguntas test
    if (trimmed.startsWith('## PREGUNTAS_TEST') || trimmed.startsWith('## PREGUNTES_TEST') || trimmed.startsWith('## PART I') || trimmed.startsWith('## PARTE I')) {
      if (currentQ) {
        testQuestions.push(currentQ);
        currentQ = null;
      }
      headerLines.push(raw);
      i++;
      continue;
    }

    // Si encontramos desarrollo posterior
    if (trimmed.startsWith('## PREGUNTAS_DESARROLLO') || trimmed.startsWith('## PREGUNTES_DESARROLLO') || trimmed.startsWith('## PART II') || trimmed.startsWith('## PARTE II')) {
      if (currentQ) {
        testQuestions.push(currentQ);
        currentQ = null;
      }
      middleOrDesarrolloLines.push(raw);
      i++;
      continue;
    }

    // Opción de test: "*a) ...", "a) ...", "- a) ..."
    const optMatch = trimmed.match(/^(?:[-*•]\s*)?(\*?)\(?([a-dA-D])[\)\.]\s*(.+)/i);
    if (optMatch && currentQ) {
      const isAsterisk = optMatch[1] === '*' || trimmed.startsWith('*') || /^\(?\*?[a-dA-D][\)\.]\s*\*/.test(trimmed);
      const isMarker = /\[CORRECTA\]|\[CORRECTE\]|\[X\]|\(CORRECTA\)|\(CORRECTE\)|\(X\)|\[VERITABLE\]|\[CERT\]/i.test(trimmed);
      const isCorrecta = isAsterisk || isMarker;
      const letra = optMatch[2].toLowerCase();
      const texto = optMatch[3]
        .replace(/\[CORRECTA\]/gi, '')
        .replace(/\[CORRECTE\]/gi, '')
        .replace(/\[X\]/gi, '')
        .replace(/\(CORRECTA\)/gi, '')
        .replace(/\(CORRECTE\)/gi, '')
        .replace(/\(X\)/gi, '')
        .replace(/\[VERITABLE\]/gi, '')
        .replace(/\[CERT\]/gi, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/^\*+|\*+$/g, '')
        .trim();

      currentQ.opciones.push({
        letra,
        texto,
        correcta: isCorrecta
      });
      i++;
      continue;
    }

    // Enunciado de pregunta test numerada: "1. ¿...?"
    const qMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)/);
    if (qMatch) {
      // Mirar si es test examinando las siguientes líneas
      let isTest = false;
      for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
        const nextL = lines[j].trim();
        if (!nextL) continue;
        if (nextL.match(/^(?:[-*•]\s*)?\(?\*?[a-dA-D][\)\.]\s*/i)) {
          isTest = true;
          break;
        }
        if (nextL.startsWith('- Pautas:') || nextL.startsWith('- Líneas:') || nextL.startsWith('[LÍNEAS:')) {
          isTest = false;
          break;
        }
        if (nextL.match(/^\d+[\.\)]/)) break;
      }

      if (isTest) {
        if (currentQ) {
          testQuestions.push(currentQ);
        }
        currentQ = {
          num: parseInt(qMatch[1], 10),
          enunciado: qMatch[2].replace(/^\*\*(.*?)\*\*$/, '$1').replace(/^__(.*?)__$/, '$1').trim(),
          opciones: []
        };
        i++;
        continue;
      }
    }

    if (currentQ) {
      // Si ya estábamos en una pregunta y no es opción ni nueva pregunta
      if (trimmed === '---' || trimmed === '***') {
        testQuestions.push(currentQ);
        currentQ = null;
        middleOrDesarrolloLines.push(raw);
        i++;
        continue;
      }
    }

    if (testQuestions.length === 0 && !currentQ) {
      headerLines.push(raw);
    } else {
      middleOrDesarrolloLines.push(raw);
    }
    i++;
  }

  if (currentQ) {
    testQuestions.push(currentQ);
  }

  // Asegurar que cada pregunta tenga la opción correcta vinculada
  for (const q of testQuestions) {
    const hasCorrect = q.opciones.some(o => o.correcta);
    if (!hasCorrect) {
      if (solucionarioKeys.has(q.num)) {
        const solLetra = solucionarioKeys.get(q.num)!;
        const opt = q.opciones.find((o, idx) => o.letra.toLowerCase() === solLetra || LETTERS[idx] === solLetra);
        if (opt) {
          opt.correcta = true;
        } else if (q.opciones.length > 0) {
          q.opciones[0].correcta = true;
        }
      } else if (q.opciones.length > 0) {
        q.opciones[0].correcta = true;
      }
    }
  }

  return { headerLines, testQuestions, middleOrDesarrolloLines };
}

/**
 * Reconstruye el documento Markdown a partir de preguntas y cabeceras,
 * recalculando y generando el bloque SOLUCIONARIO oficial sincronizado.
 */
export function buildExamenMarkdown(
  headerLines: string[],
  testQuestions: TestQuestion[],
  middleOrDesarrolloLines: string[],
  isVa: boolean = false
): string {
  const parts: string[] = [];

  // 1. Cabecera inicial
  if (headerLines.length > 0) {
    parts.push(headerLines.join('\n').trim());
  }

  // 2. Preguntas tipo test numeradas consecutivamente 1..N
  const questionsCode = testQuestions.map((q, idx) => {
    const qNum = idx + 1;
    const opcionesCode = q.opciones.map((opt, oIdx) => {
      const letra = LETTERS[oIdx] || 'a';
      const mark = opt.correcta ? '*' : '';
      return `   ${mark}${letra}) ${opt.texto}`;
    }).join('\n');

    return `${qNum}. ${q.enunciado}\n${opcionesCode}`;
  }).join('\n\n');

  if (questionsCode) {
    parts.push(questionsCode);
  }

  // 3. Líneas intermedias / preguntas de desarrollo
  if (middleOrDesarrolloLines.length > 0) {
    const midClean = middleOrDesarrolloLines.join('\n').trim();
    if (midClean) {
      parts.push(midClean);
    }
  }

  // 4. Bloque SOLUCIONARIO oficial sincronizado dinámicamente
  const solHeader = isVa ? 'SOLUCIONARI' : 'SOLUCIONARIO';
  const solItems: string[] = [];

  testQuestions.forEach((q, idx) => {
    const qNum = idx + 1;
    const cIdx = q.opciones.findIndex(o => o.correcta);
    const correctLetter = cIdx >= 0 ? (LETTERS[cIdx] || 'a') : 'a';
    const correctText = cIdx >= 0 ? q.opciones[cIdx].texto : (q.opciones[0]?.texto || '');
    solItems.push(`${qNum}. ${correctLetter}) ${correctText}`);
  });

  if (solItems.length > 0) {
    parts.push(`---\n${solHeader}\n` + solItems.join('\n'));
  }

  return parts.join('\n\n');
}

/**
 * Aleatoriza el orden de las preguntas tipo test (1..N).
 * Las opciones de cada pregunta mantienen su orden interno.
 * El solucionario se sincroniza con el nuevo orden de preguntas.
 */
export function aleatorizarPreguntas(markdown: string, isVa: boolean = false): string {
  const { headerLines, testQuestions, middleOrDesarrolloLines } = extractExamenQuestions(markdown);
  if (testQuestions.length <= 1) return markdown;

  const shuffledQuestions = shuffleDistinct(testQuestions, q => q.enunciado);
  return buildExamenMarkdown(headerLines, shuffledQuestions, middleOrDesarrolloLines, isVa);
}

/**
 * Aleatoriza las respuestas (opciones) dentro de cada pregunta tipo test.
 * Las letras se mantienen ordenadas [a, b, c, d].
 * La opción que era correcta se traslada a su nueva letra y se actualiza el solucionario.
 */
export function aleatorizarRespuestas(markdown: string, isVa: boolean = false): string {
  const { headerLines, testQuestions, middleOrDesarrolloLines } = extractExamenQuestions(markdown);
  if (testQuestions.length === 0) return markdown;

  const modifiedQuestions: TestQuestion[] = testQuestions.map(q => {
    if (q.opciones.length <= 1) return q;

    const shuffledOptions = shuffleDistinct(q.opciones, o => o.texto);
    // Asignar nuevas letras ordenadas: a, b, c, d
    const updatedOptions: TestOption[] = shuffledOptions.map((opt, idx) => ({
      ...opt,
      letra: LETTERS[idx] || 'a',
      correcta: opt.correcta,
    }));

    return {
      ...q,
      opciones: updatedOptions,
    };
  });

  return buildExamenMarkdown(headerLines, modifiedQuestions, middleOrDesarrolloLines, isVa);
}

/**
 * Genera una nueva versión completa con preguntas Y respuestas aleatorizadas,
 * garantizando que tenga una permutación distinta.
 */
export function generarNuevaVersionExamen(
  markdownBase: string,
  isVa: boolean = false
): string {
  const conPreguntasShuffled = aleatorizarPreguntas(markdownBase, isVa);
  return aleatorizarRespuestas(conPreguntasShuffled, isVa);
}
