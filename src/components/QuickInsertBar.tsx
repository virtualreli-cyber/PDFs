import React from 'react';
import type { SectionType, Language } from '../types';

interface QuickInsertBarProps {
  section: SectionType;
  lang: Language;
  onInsert: (snippet: string) => void;
}

export const QuickInsertBar: React.FC<QuickInsertBarProps> = ({
  section,
  lang,
  onInsert,
}) => {
  const isVa = lang === 'va';

  if (section === 'apuntes') {
    return (
      <div className="quick-insert-container">
        <span className="quick-insert-label">{isVa ? 'Inserir:' : 'Insertar:'}</span>
        <div className="quick-insert-scroll">
          <button
            type="button"
            className="btn-pill"
            onClick={() => onInsert(`\n# BLOQUE 1: ${isVa ? "Títol del bloc temàtic" : "Título del bloque temático"}\n`)}
            title={isVa ? "Afegir bloc temàtic" : "Añadir Bloque Temático"}
          >
            📑 {isVa ? 'Bloc' : 'Bloque'}
          </button>

          <button
            type="button"
            className="btn-pill"
            onClick={() => onInsert(`\n### 1.1 ${isVa ? "Títol de l'apartat" : "Título del apartado"}\n`)}
            title={isVa ? "Afegir secció / apartat" : "Añadir Sección / Apartado"}
          >
            🏷️ {isVa ? 'Apartat' : 'Apartado'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-lavender"
            onClick={() => onInsert(`\n> 📖 **[${isVa ? "CITA BÍBLICA / MAGISTERI" : "CITA BÍBLICA / MAGISTERIO"}]:** ${isVa ? "Títol" : "Título"}\n> «${isVa ? "Text de la cita bíblica o magisterial..." : "Texto de la cita bíblica o magisterial..."}»\n> — ${isVa ? "Autor / Document" : "Autor / Documento"}\n`)}
            title={isVa ? "Caixa Cita Bíblica / Magisteri" : "Caja Cita Bíblica / Magisterio"}
          >
            📖 {isVa ? 'Cita' : 'Cita'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-mint"
            onClick={() => onInsert(`\n> 💡 **[${isVa ? "EXEMPLE DEL DIA A DIA" : "EJEMPLO DEL DÍA A DÍA"}]:** ${isVa ? "Títol" : "Título"}\n> ${isVa ? "Descripció de l'exemple quotidià..." : "Descripción del ejemplo cotidiano..."}\n`)}
            title={isVa ? "Caixa Exemple del Dia a Dia" : "Caja Ejemplo del Día a Día"}
          >
            💡 {isVa ? 'Exemple' : 'Ejemplo'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-blue"
            onClick={() => onInsert(`\n> 📚 **[${isVa ? "GLOSSARI" : "GLOSARIO"}]:** ${isVa ? "Concepte clau" : "Concepto clave"}\n> ${isVa ? "Definició breu i precisa del concepte..." : "Definición breve y precisa del concepto..."}\n`)}
            title={isVa ? "Caixa Glossari Conceptual" : "Caja Glosario Conceptual"}
          >
            📚 {isVa ? 'Glossari' : 'Glosario'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-yellow"
            onClick={() => onInsert(`\n> 🏛️ **[${isVa ? "DADA HISTÒRICA" : "UN DATO HISTÓRICO"}]:** ${isVa ? "Títol de l'esdeveniment" : "Título del evento"}\n> ${isVa ? "Ressenya del fet històric rellevant..." : "Reseña del hecho histórico relevante..."}\n`)}
            title={isVa ? "Caixa Dada Històrica" : "Caja Dato Histórico"}
          >
            🏛️ {isVa ? 'Història' : 'Histórico'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-rose"
            onClick={() => onInsert(`\n> 🎨 **[${isVa ? "ART I SÍMBOL" : "ARTE Y SÍMBOLO"}]:** ${isVa ? "Títol" : "Título"}\n> ${isVa ? "Explicació del símbol cristià o obra d'art..." : "Explicación del símbolo cristiano u obra de arte..."}\n`)}
            title={isVa ? "Caixa Art i Símbol" : "Caja Arte y Símbolo"}
          >
            🎨 {isVa ? 'Art' : 'Arte'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-sky"
            onClick={() => onInsert(`\n> 👤 **[${isVa ? "UN TESTIMONI" : "UN TESTIMONIO"}]:** ${isVa ? "Nom" : "Nombre"}\n> ${isVa ? "Relat de vida i compromís de la persona..." : "Relato de vida y compromiso de la persona..."}\n`)}
            title={isVa ? "Caixa Testimoni" : "Caja Testimonio"}
          >
            👤 {isVa ? 'Testimoni' : 'Testimonio'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-teal"
            onClick={() => onInsert(`\n> ❓ **[${isVa ? "SABIES QUE...?" : "¿SABÍAS QUE...?"}]:** ${isVa ? "Curiositat" : "Curiosidad"}\n> ${isVa ? "Dada curiosa o d'interés educatiu..." : "Dato curioso o de interés educativo..."}\n`)}
            title={isVa ? "Caixa Sabies que...?" : "Caja ¿Sabías que...?"}
          >
            ❓ {isVa ? 'Sabies que' : '¿Sabías que?'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-peach"
            onClick={() => onInsert(`\n> 🧭 **[${isVa ? "PER A PENSAR" : "PARA PENSAR"}]:** ${isVa ? "Pregunta de reflexió" : "Pregunta de reflexión"}\n> ${isVa ? "Qüestió per al diàleg o debat ètic..." : "Cuestión para el diálogo o debate ético..."}\n`)}
            title={isVa ? "Caixa Per a Pensar" : "Caja Para Pensar"}
          >
            🧭 {isVa ? 'Pensar' : 'Pensar'}
          </button>

          <button
            type="button"
            className="btn-pill"
            onClick={() => onInsert(`\n<!-- solo-extendido -->\n${isVa ? "Text secundari que s'ometrà en la versió abreujada..." : "Texto secundario que se omitirá en la versión abreviada..."}\n<!-- fin-extendido -->\n`)}
            title={isVa ? "Ometre en Versió Abreviada" : "Omitir en Versión Abreviada"}
          >
            ✂️ {isVa ? 'Només estés' : 'Solo extendido'}
          </button>

          <button
            type="button"
            className="btn-pill"
            onClick={() => onInsert('\n---\n')}
            title={isVa ? "Salt de pàgina" : "Salto de página"}
          >
            📄 {isVa ? 'Salt de pàgina' : 'Salto pág.'}
          </button>
        </div>
      </div>
    );
  }

  if (section === 'examenes') {
    return (
      <div className="quick-insert-container">
        <span className="quick-insert-label">{isVa ? 'Inserir:' : 'Insertar:'}</span>
        <div className="quick-insert-scroll">
          <button
            type="button"
            className="btn-pill pastel-sky"
            onClick={() => onInsert(`\n# ${isVa ? "INSTRUCCIONS:" : "INSTRUCCIONES:"} ${isVa ? "Llig atentament cada qüestió i respon amb claredat en l'espai indicat." : "Lee atentamente cada cuestión y responde con claridad en el espacio indicado."}\n`)}
            title={isVa ? "Afegir caixetí d'instruccions oficials" : "Añadir cajetín de instrucciones oficiales"}
          >
            📋 {isVa ? 'Instruccions' : 'Instrucciones'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-yellow"
            onClick={() => onInsert(`\n## ${isVa ? "PART I: PREGUNTES TIPUS TEST (5,0 punts)" : "PARTE I: PREGUNTAS TIPO TEST (5,0 puntos)"}\n${isVa ? "Instruccions específiques d'aquesta part de la prova..." : "Instrucciones específicas de esta parte del examen..."}\n`)}
            title={isVa ? "Afegir caixetí d'instruccions per a una part de l'examen" : "Añadir cajetín de instrucciones para una parte del examen"}
          >
            🏷️ {isVa ? 'Part / Instrucció' : 'Parte / Instrucción'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-teal"
            onClick={() => onInsert(`\n1. ¿${isVa ? "Enunciat de la pregunta tipus test?" : "Enunciado de la pregunta tipo test?"}\n   *a) ${isVa ? "Opció correcta (marcada amb *)" : "Opción correcta (marcada con *)"}\n   b) ${isVa ? "Opció distractora 1" : "Opción distractora 1"}\n   c) ${isVa ? "Opció distractora 2" : "Opción distractora 2"}\n   d) ${isVa ? "Opció distractora 3" : "Opción distractora 3"}\n`)}
            title={isVa ? "Afegir pregunta tipus test amb 4 opcions" : "Añadir pregunta tipo test con 4 opciones"}
          >
            ❓ {isVa ? 'Pregunta Test' : 'Pregunta Test'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-lavender"
            onClick={() => onInsert(`\n1. [2,0 ptos] ${isVa ? "Enunciat de la qüestió de desenvolupament..." : "Enunciado de la cuestión de desarrollo..."}\n- Pautas: ${isVa ? "Criteris de qualificació i termes clau a incloure" : "Criterios de calificación y términos clave a incluir"}\n- Líneas: 6\n`)}
            title={isVa ? "Afegir pregunta de desenvolupament" : "Añadir pregunta de desarrollo"}
          >
            ✍️ {isVa ? 'Desenvolupament' : 'Desarrollo'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-rose"
            onClick={() => onInsert(`\n---\n${isVa ? "SOLUCIONARI" : "SOLUCIONARIO"}\n1. a) ${isVa ? "Resposta correcta..." : "Respuesta correcta..."}\n`)}
            title={isVa ? "Afegir bloc de solucionari oficial" : "Añadir bloque de solucionario oficial"}
          >
            🔑 {isVa ? 'Solucionari' : 'Solucionario'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-peach"
            onClick={() => onInsert(`\n# BLOQUE 1: ${isVa ? "Conceptes clau i definicions (3,0 punts)" : "Conceptos clave y definiciones (3,0 puntos)"}\n`)}
            title={isVa ? "Afegir bloc temàtic de desenvolupament" : "Añadir bloque temático de desarrollo"}
          >
            📑 {isVa ? 'Bloc temàtic' : 'Bloque'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-mint"
            onClick={() => onInsert(`\n> «${isVa ? "Fragment de text per a comentar o analitzar..." : "Fragmento de texto para comentar o analizar..."}» (${isVa ? "Referència bíblica o magisterial" : "Referencia bíblica o magisterial"})\n`)}
            title={isVa ? "Afegir cita o text d'anàlisi" : "Añadir cita o texto de análisis"}
          >
            📜 {isVa ? 'Cita Anàlisi' : 'Cita Análisis'}
          </button>

          <button
            type="button"
            className="btn-pill"
            onClick={() => onInsert('\n---\n')}
            title={isVa ? "Salt de pàgina" : "Salto de página"}
          >
            📄 {isVa ? 'Salt de pàgina' : 'Salto pág.'}
          </button>
        </div>
      </div>
    );
  }

  // Tareas
  return (
    <div className="quick-insert-container">
      <span className="quick-insert-label">{isVa ? 'Inserir:' : 'Insertar:'}</span>
      <div className="quick-insert-scroll">
        <button
          type="button"
          className="btn-pill pastel-mint"
          onClick={() => onInsert(`\n## ${isVa ? "ACTIVITAT" : "ACTIVIDAD"} 1: ${isVa ? "Títol de l'activitat" : "Título de la actividad"}\n- ${isVa ? "Sessió: 1" : "Sesión: 1"}\n- ${isVa ? "Tipus: Portfoli" : "Tipo: Portfolio"}\n- ${isVa ? "Instruccions:" : "Instrucciones:"} ${isVa ? "Llig amb atenció i respon a les preguntes." : "Lee con atención y responde a las preguntas."}\n`)}
          title={isVa ? "Nova activitat (1 pàgina independent)" : "Nueva actividad (1 página independiente)"}
        >
          🚀 {isVa ? 'Activitat' : 'Actividad'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-sky"
          onClick={() => onInsert(`\n| ${isVa ? "Concepte / Àmbit" : "Concepto / Ámbito"} | ${isVa ? "Característiques clau" : "Características clave"} | ${isVa ? "Aplicació pràctica" : "Aplicación práctica"} |\n| :--- | :--- | :--- |\n| ${isVa ? "Opció A" : "Opción A"} | [ ] ${isVa ? "Verificat" : "Verificado"} | [${isVa ? "LÍNIES: 2" : "LÍNEAS: 2"}] |\n| ${isVa ? "Opció B" : "Opción B"} | [ ] ${isVa ? "Verificat" : "Verificado"} | [${isVa ? "LÍNIES: 2" : "LÍNEAS: 2"}] |\n`)}
          title={isVa ? "Inserir taula comparativa o de classificació amb pauta de línies i caselles" : "Insertar tabla comparativa o de clasificación con pauta de líneas y casillas"}
        >
          📊 {isVa ? 'Taula' : 'Tabla'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-blue"
          onClick={() => onInsert(`\n> 💡 **[${isVa ? "CAS PRÀCTIC" : "CASO PRÁCTICO"}]:** ${isVa ? "Títol de la situació real" : "Título de la situación real"}\n> ${isVa ? "Descripció de la vivència quotidiana o situació dilemàtica per a analitzar a classe..." : "Descripción de la vivencia cotidiana o situación dilemática para analizar en clase..."}\n`)}
          title={isVa ? "Caixa de cas pràctic o vivència quotidiana" : "Caja de caso práctico o vivencia cotidiana"}
        >
          💡 {isVa ? 'Cas Pràctic' : 'Caso Práctico'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-yellow"
          onClick={() => onInsert(`\n> ⚖️ **[${isVa ? "DILEMA MORAL" : "DILEMA MORAL"}]:** ${isVa ? "Conflicte de valors" : "Conflicto de valores"}\n> ${isVa ? "Exposició del conflicte ètic entre dos decisions o valors cristians en tensió..." : "Exposición del conflicto ético entre dos decisiones o valores cristianos en tensión..."}\n`)}
          title={isVa ? "Caixa de dilema moral o ètic" : "Caja de dilema moral o ético"}
        >
          ⚖️ {isVa ? 'Dilema Moral' : 'Dilema Moral'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-lavender"
          onClick={() => onInsert(`\n> 📚 **[${isVa ? "CONCEPTE CLAU" : "CONCEPTO CLAVE"}]:** ${isVa ? "Terme o ensenyament" : "Término o enseñanza"}\n> ${isVa ? "Definició sintètica i precisa del concepte doctrinal o ètic fonamental..." : "Definición sintética y precisa del concepto doctrinal o ético fundamental..."}\n`)}
          title={isVa ? "Caixa de concepte clau o glossari" : "Caja de concepto clave o glosario"}
        >
          📚 {isVa ? 'Concepte' : 'Concepto'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-rose"
          onClick={() => onInsert(`\n### ${isVa ? "INSTRUCCIONS DE TREBALL" : "INSTRUCCIONES"}\n1. ${isVa ? "Llig atentament els documents i fonts de la sessió." : "Lee con atención los textos y fuentes de la sesión."}\n2. ${isVa ? "Respon a les qüestions de manera argumentada i personal." : "Responde a las cuestiones de manera argumentada y personal."}\n3. ${isVa ? "Redacta entre 4 i 6 línies per apartat amb rigor." : "Redacta entre 4 y 6 líneas por apartado con rigor."}\n`)}
          title={isVa ? "Bloc d'instruccions estructurades de treball" : "Bloque de instrucciones estructuradas de trabajo"}
        >
          📋 {isVa ? 'Instruccions' : 'Instrucciones'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-teal"
          onClick={() => onInsert(`\n### ${isVa ? "QÜESTIONS A RESOLDRE" : "CUESTIONES A RESOLVER"}\n`)}
          title={isVa ? "Separador de subsecció d'exercicis" : "Separador de subsección de ejercicios"}
        >
          🏷️ {isVa ? 'Subsecció' : 'Subsección'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-lavender"
          onClick={() => onInsert(`\n1. ${isVa ? "Enunciat de la qüestió pautada..." : "Enunciado de la cuestión pautada..."}\n[${isVa ? "LÍNIES: 4" : "LÍNEAS: 4"}]\n`)}
          title={isVa ? "Pregunta amb línies pautades d'escriptura" : "Pregunta con líneas pautadas de escritura"}
        >
          ✍️ {isVa ? 'Pregunta Pautada' : 'Pregunta Pautada'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-sky"
          onClick={() => onInsert(`\n> 📜 **[${isVa ? "DOCUMENT HISTÒRIC" : "DOCUMENTO HISTÓRICO"}]:** ${isVa ? "Títol del document" : "Título del documento"}\n> «${isVa ? "Text històric o cita d'anàlisi per a l'activitat..." : "Texto histórico o cita de análisis para la actividad..."}»\n`)}
          title={isVa ? "Caixa de font o lectura històrica" : "Caja de fuente o lectura histórica"}
        >
          📜 {isVa ? 'Font Històrica' : 'Fuente Histórica'}
        </button>

        <button
          type="button"
          className="btn-pill"
          onClick={() => onInsert('[ ] ')}
          title={isVa ? "Inserir casella de verificació [ ]" : "Insertar casilla de verificación [ ]"}
        >
          ☑️ {isVa ? 'Casella [ ]' : 'Casilla [ ]'}
        </button>

        <button
          type="button"
          className="btn-pill"
          onClick={() => onInsert('\n---\n')}
          title={isVa ? "Salt de pàgina" : "Salto de página"}
        >
          📄 {isVa ? 'Salt de pàgina' : 'Salto pág.'}
        </button>
      </div>
    </div>
  );
};
