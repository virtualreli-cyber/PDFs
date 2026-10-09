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
            title="Añadir Bloque Temático"
          >
            📑 {isVa ? 'Bloc' : 'Bloque'}
          </button>

          <button
            type="button"
            className="btn-pill"
            onClick={() => onInsert(`\n### 1.1 ${isVa ? "Títol de l'apartat" : "Título del apartado"}\n`)}
            title="Añadir Sección / Apartado"
          >
            🏷️ {isVa ? 'Apartat' : 'Apartado'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-lavender"
            onClick={() => onInsert(`\n> 📖 **[${isVa ? "CITA BÍBLICA / MAGISTERI" : "CITA BÍBLICA / MAGISTERIO"}]:** ${isVa ? "Títol" : "Título"}\n> «${isVa ? "Text de la cita bíblica o magisterial..." : "Texto de la cita bíblica o magisterial..."}»\n> — ${isVa ? "Autor / Document" : "Autor / Documento"}\n`)}
            title="Caja Cita Bíblica / Magisterio"
          >
            📖 Cita
          </button>

          <button
            type="button"
            className="btn-pill pastel-mint"
            onClick={() => onInsert(`\n> 💡 **[${isVa ? "EXEMPLE DEL DIA A DIA" : "EJEMPLO DEL DÍA A DÍA"}]:** ${isVa ? "Títol" : "Título"}\n> ${isVa ? "Descripció de l'exemple quotidià..." : "Descripción del ejemplo cotidiano..."}\n`)}
            title="Caja Ejemplo del Día a Día"
          >
            💡 {isVa ? 'Exemple' : 'Ejemplo'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-blue"
            onClick={() => onInsert(`\n> 📚 **[${isVa ? "GLOSSARI" : "GLOSARIO"}]:** ${isVa ? "Concepte clau" : "Concepto clave"}\n> ${isVa ? "Definició breu i precisa del concepte..." : "Definición breve y precisa del concepto..."}\n`)}
            title="Caja Glosario Conceptual"
          >
            📚 {isVa ? 'Glossari' : 'Glosario'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-yellow"
            onClick={() => onInsert(`\n> 🏛️ **[${isVa ? "DADA HISTÒRICA" : "UN DATO HISTÓRICO"}]:** ${isVa ? "Títol de l'esdeveniment" : "Título del evento"}\n> ${isVa ? "Ressenya del fet històric rellevant..." : "Reseña del hecho histórico relevante..."}\n`)}
            title="Caja Dato Histórico"
          >
            🏛️ {isVa ? 'Història' : 'Histórico'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-rose"
            onClick={() => onInsert(`\n> 🎨 **[${isVa ? "ART I SÍMBOL" : "ARTE Y SÍMBOLO"}]:** ${isVa ? "Títol" : "Título"}\n> ${isVa ? "Explicació del símbol cristià o obra d'art..." : "Explicación del símbolo cristiano u obra de arte..."}\n`)}
            title="Caja Arte y Símbolo"
          >
            🎨 Arte
          </button>

          <button
            type="button"
            className="btn-pill pastel-sky"
            onClick={() => onInsert(`\n> 👤 **[${isVa ? "UN TESTIMONI" : "UN TESTIMONIO"}]:** ${isVa ? "Nom" : "Nombre"}\n> ${isVa ? "Relat de vida i compromís de la persona..." : "Relato de vida y compromiso de la persona..."}\n`)}
            title="Caja Testimonio"
          >
            👤 {isVa ? 'Testimoni' : 'Testimonio'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-teal"
            onClick={() => onInsert(`\n> ❓ **[${isVa ? "SABIES QUE...?" : "¿SABÍAS QUE...?"}]:** ${isVa ? "Curiositat" : "Curiosidad"}\n> ${isVa ? "Dada curiosa o d'interés educatiu..." : "Dato curioso o de interés educativo..."}\n`)}
            title="Caja ¿Sabías que...?"
          >
            ❓ {isVa ? 'Sabies que' : '¿Sabías que?'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-peach"
            onClick={() => onInsert(`\n> 🧭 **[${isVa ? "PER A PENSAR" : "PARA PENSAR"}]:** ${isVa ? "Pregunta de reflexió" : "Pregunta de reflexión"}\n> ${isVa ? "Qüestió per al diàleg o debat ètic..." : "Cuestión para el diálogo o debate ético..."}\n`)}
            title="Caja Para Pensar"
          >
            🧭 {isVa ? 'Pensar' : 'Pensar'}
          </button>

          <button
            type="button"
            className="btn-pill"
            onClick={() => onInsert(`\n<!-- solo-extendido -->\n${isVa ? "Text secundari que s'ometrà en la versió abreujada..." : "Texto secundario que se omitirá en la versión abreviada..."}\n<!-- fin-extendido -->\n`)}
            title="Omitir en Versión Abreviada"
          >
            ✂️ {isVa ? 'Només estés' : 'Solo extendido'}
          </button>

          <button
            type="button"
            className="btn-pill"
            onClick={() => onInsert('\n---\n')}
            title="Salto de página"
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
            className="btn-pill pastel-teal"
            onClick={() => onInsert(`\n1. ¿${isVa ? "Enunciat de la pregunta tipus test?" : "Enunciado de la pregunta tipo test?"}\n   *a) ${isVa ? "Opció correcta (marcada amb *)" : "Opción correcta (marcada con *)"}\n   b) ${isVa ? "Opció distractora 1" : "Opción distractora 1"}\n   c) ${isVa ? "Opció distractora 2" : "Opción distractora 2"}\n   d) ${isVa ? "Opció distractora 3" : "Opción distractora 3"}\n`)}
            title="Añadir pregunta tipo test con 4 opciones"
          >
            ❓ {isVa ? 'Pregunta Test' : 'Pregunta Test'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-lavender"
            onClick={() => onInsert(`\n1. [2,0 ptos] ${isVa ? "Enunciat de la qüestió de desenvolupament..." : "Enunciado de la cuestión de desarrollo..."}\n- Pautas: ${isVa ? "Criteris de qualificació i termes clau a incloure" : "Criterios de calificación y términos clave a incluir"}\n- Líneas: 6\n`)}
            title="Añadir pregunta de desarrollo"
          >
            ✍️ {isVa ? 'Desenvolupament' : 'Desarrollo'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-peach"
            onClick={() => onInsert(`\n# BLOQUE 1: ${isVa ? "Conceptes clau i definicions (3,0 punts)" : "Conceptos clave y definiciones (3,0 puntos)"}\n`)}
            title="Añadir bloque temático de desarrollo"
          >
            📑 {isVa ? 'Bloc temàtic' : 'Bloque'}
          </button>

          <button
            type="button"
            className="btn-pill pastel-mint"
            onClick={() => onInsert(`\n> «${isVa ? "Fragment de text per a comentar o analitzar..." : "Fragmento de texto para comentar o analizar..."}» (${isVa ? "Referència bíblica o magisterial" : "Referencia bíblica o magisterial"})\n`)}
            title="Añadir cita o texto de análisis"
          >
            📜 {isVa ? 'Cita Anàlisi' : 'Cita Análisis'}
          </button>

          <button
            type="button"
            className="btn-pill"
            onClick={() => onInsert('\n---\n')}
            title="Salto de página"
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
          onClick={() => onInsert(`\n## ACTIVIDAD 1: ${isVa ? "Títol de l'activitat" : "Título de la actividad"}\n- Sesión: 1\n- Tipo: Portfolio\n- Instrucciones: ${isVa ? "Llig amb atenció i respon a les preguntes." : "Lee con atención y responde a las preguntas."}\n`)}
          title="Nueva actividad (1 página independiente)"
        >
          🚀 {isVa ? 'Activitat' : 'Actividad'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-lavender"
          onClick={() => onInsert(`\n1. ${isVa ? "Enunciat de la qüestió pautada..." : "Enunciado de la cuestión pautada..."}\n[LÍNEAS: 4]\n`)}
          title="Pregunta con líneas pautadas de escritura"
        >
          ✍️ {isVa ? 'Pregunta Pautada' : 'Pregunta Pautada'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-sky"
          onClick={() => onInsert(`\n> 📜 **[${isVa ? "DOCUMENT HISTÒRIC" : "DOCUMENTO HISTÓRICO"}]:** ${isVa ? "Títol del document" : "Título del documento"}\n> «${isVa ? "Text històric o cita d'anàlisi per a l'activitat..." : "Texto histórico o cita de análisis para la actividad..."}»\n`)}
          title="Caja de fuente o lectura histórica"
        >
          📜 {isVa ? 'Font Històrica' : 'Fuente Histórica'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-yellow"
          onClick={() => onInsert(`\n- Tipo: Portfolio\n`)}
          title="Badge Portfolio"
        >
          🏷️ Portfolio
        </button>

        <button
          type="button"
          className="btn-pill pastel-yellow"
          onClick={() => onInsert(`\n- Tipo: Proyecto\n`)}
          title="Badge Proyecto"
        >
          🏷️ {isVa ? 'Projecte' : 'Proyecto'}
        </button>

        <button
          type="button"
          className="btn-pill pastel-yellow"
          onClick={() => onInsert(`\n- Tipo: Reto\n`)}
          title="Badge Reto"
        >
          🏷️ {isVa ? 'Repte' : 'Reto'}
        </button>

        <button
          type="button"
          className="btn-pill"
          onClick={() => onInsert('\n---\n')}
          title="Salto de página"
        >
          📄 {isVa ? 'Salt de pàgina' : 'Salto pág.'}
        </button>
      </div>
    </div>
  );
};
