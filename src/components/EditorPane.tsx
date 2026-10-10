import React, { useRef } from 'react';
import type { SectionType, Language, ApuntesMode, ExamenTipo, ExamenDocType, FontSizesConfig } from '../types';
import { QuickInsertBar } from './QuickInsertBar';
import { RotateCcw, Trash2, Scissors, CheckCircle2, Type } from 'lucide-react';

interface EditorPaneProps {
  section: SectionType;
  lang: Language;
  markdown: string;
  onMarkdownChange: (md: string) => void;
  // Opciones de Apuntes
  apuntesMode: ApuntesMode;
  onApuntesModeChange: (mode: ApuntesMode) => void;
  onCondenseApuntes: () => void;
  // Opciones de Exámenes
  examenTipo: ExamenTipo;
  onExamenTipoChange: (tipo: ExamenTipo) => void;
  examenDocType: ExamenDocType;
  onExamenDocTypeChange: (docType: ExamenDocType) => void;
  examQuestionsPerPage: string;
  onExamQuestionsPerPageChange: (val: string) => void;
  // Ajustes tipográficos
  fontSizes: FontSizesConfig;
  onFontSizeNudge: (key: keyof FontSizesConfig, delta: number) => void;
  onFontSizeSet: (key: keyof FontSizesConfig, val: number) => void;
  onResetFontSizes: () => void;
  // Acciones generales
  onLoadSample: () => void;
  onClear: () => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  section,
  lang,
  markdown,
  onMarkdownChange,
  apuntesMode,
  onApuntesModeChange,
  onCondenseApuntes,
  examenTipo,
  onExamenTipoChange,
  examenDocType,
  onExamenDocTypeChange,
  examQuestionsPerPage,
  onExamQuestionsPerPageChange,
  fontSizes,
  onFontSizeNudge,
  onFontSizeSet,
  onResetFontSizes,
  onLoadSample,
  onClear,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isVa = lang === 'va';

  // Etiquetas contextuales según la vista activa
  const getLabels = () => {
    if (section === 'apuntes') {
      return {
        titulos: isVa ? 'Títols' : 'Títulos',
        apartados: isVa ? 'Apartats' : 'Apartados',
        contenido: isVa ? 'Text' : 'Texto',
        titulosTip: isVa ? "Mida del títol principal i subtítol del tema" : "Tamaño del título principal y subtítulo del tema",
        apartadosTip: isVa ? "Mida dels apartats H1 i H2" : "Tamaño de los apartados H1 y H2",
        contenidoTip: isVa ? "Mida del cos de text, paràgrafs i caixes" : "Tamaño del cuerpo de texto, párrafos y cajas",
      };
    }
    if (section === 'examenes') {
      return {
        titulos: isVa ? 'Títols' : 'Títulos',
        apartados: isVa ? 'Preguntes' : 'Preguntas',
        contenido: isVa ? 'Respostes' : 'Respuestas',
        instrucciones: isVa ? 'Instruccions' : 'Instrucciones',
        titulosTip: isVa ? "Mida del títol del tema i prova" : "Tamaño del título del examen",
        apartadosTip: isVa ? "Mida dels enunciats de les preguntes" : "Tamaño de los enunciados de las preguntas",
        contenidoTip: isVa ? "Mida del text de les opcions de test i respostes" : "Tamaño del texto de las opciones de test y respuestas",
        instruccionesTip: isVa ? "Mida de les instruccions generals i de cada part" : "Tamaño de las instrucciones generales y de cada parte",
      };
    }
    return {
      titulos: isVa ? 'Activitat' : 'Actividad',
      apartados: isVa ? 'Preguntes' : 'Preguntas',
      contenido: isVa ? 'Fonts/Text' : 'Fuentes/Texto',
      titulosTip: isVa ? "Mida de la capçalera de l'activitat" : "Tamaño de la cabecera de la actividad",
      apartadosTip: isVa ? "Mida dels enunciats dels exercicis" : "Tamaño de los enunciados de los ejercicios",
      contenidoTip: isVa ? "Mida dels textos de lectura i fonts" : "Tamaño de los textos de lectura y fuentes",
    };
  };

  const labels = getLabels();

  const handleInsert = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onMarkdownChange(markdown + snippet);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = markdown.substring(0, start);
    const after = markdown.substring(end);

    const newText = before + snippet + after;
    onMarkdownChange(newText);

    // Reposicionar cursor tras la inserción
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + snippet.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="editor-pane">
      {/* Barra de opciones de la sección */}
      <div className="editor-controls-bar">
        <div className="controls-left">
          {section === 'apuntes' && (
            <div className="segmented-group">
              <button
                type="button"
                className={`segmented-btn ${apuntesMode === 'extendido' ? 'active' : ''}`}
                onClick={() => onApuntesModeChange('extendido')}
              >
                {isVa ? 'Versió Estesa' : 'Versión Extendida'}
              </button>
              <button
                type="button"
                className={`segmented-btn ${apuntesMode === 'abreviado' ? 'active' : ''}`}
                onClick={() => onApuntesModeChange('abreviado')}
              >
                {isVa ? 'Abreujada (-30%)' : 'Abreviada (-30%)'}
              </button>
              {apuntesMode === 'abreviado' && (
                <button
                  type="button"
                  className="action-btn-small"
                  onClick={onCondenseApuntes}
                  title={isVa ? "Filtra explicacions secundàries per a reduir com a mínim el 30% del volum" : "Filtra explicaciones secundarias para reducir por lo menos el 30% del volumen"}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{isVa ? 'Condensar text' : 'Condensar texto'}</span>
                </button>
              )}
            </div>
          )}

          {section === 'examenes' && (
            <div className="exam-controls">
              <div className="segmented-group">
                <button
                  type="button"
                  className={`segmented-btn ${examenTipo === 'test' ? 'active' : ''}`}
                  onClick={() => onExamenTipoChange('test')}
                >
                  Test (20p)
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${examenTipo === 'mixto' ? 'active' : ''}`}
                  onClick={() => onExamenTipoChange('mixto')}
                >
                  {isVa ? 'Mixte' : 'Mixto'}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${examenTipo === 'desarrollo' ? 'active' : ''}`}
                  onClick={() => onExamenTipoChange('desarrollo')}
                >
                  {isVa ? 'Desenvolupament' : 'Desarrollo'}
                </button>
              </div>

              <div className="segmented-group">
                <button
                  type="button"
                  className={`segmented-btn ${examenDocType === 'examen' ? 'active' : ''}`}
                  onClick={() => onExamenDocTypeChange('examen')}
                >
                  Examen
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${examenDocType === 'solucionario' ? 'active highlight' : ''}`}
                  onClick={() => onExamenDocTypeChange('solucionario')}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isVa ? 'Solucionari' : 'Solucionario'}</span>
                </button>
              </div>

              {examenTipo !== 'desarrollo' && (
                <div className="exam-pages-control">
                  <span className="exam-control-label">{isVa ? 'Preg./pàg:' : 'Preg./pág:'}</span>
                  <input
                    type="text"
                    className="exam-pages-input"
                    value={examQuestionsPerPage}
                    onChange={(e) => onExamQuestionsPerPageChange(e.target.value)}
                    placeholder={examenTipo === 'test' ? '10, 10' : '10'}
                    title={isVa 
                      ? "Nombre de preguntes per pàgina (ex: '10, 10' o '8, 12'). Es distribuiran en 2 columnes iguals per pàgina."
                      : "Número de preguntas por página (ej: '10, 10' o '8, 12'). Se distribuirán en 2 columnas iguales por página."
                    }
                  />
                </div>
              )}
            </div>
          )}

          {section === 'tareas' && (
            <div className="meta-badge-note">
              <span>{isVa ? '1 pàgina per activitat + Rúbrica final' : '1 página por actividad + Rúbrica final'}</span>
            </div>
          )}
        </div>

        <div className="controls-right">
          <button
            type="button"
            className="action-btn-small"
            onClick={onLoadSample}
            title={isVa ? "Carregar text d'exemple" : "Cargar texto de ejemplo"}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVa ? 'Exemple' : 'Ejemplo'}</span>
          </button>
          <button
            type="button"
            className="action-btn-small text-danger"
            onClick={onClear}
            title={isVa ? "Netejar editor" : "Limpiar editor"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Barra de inserción rápida */}
      <QuickInsertBar section={section} lang={lang} onInsert={handleInsert} />

      {/* Barra de ajuste tipográfico dinámico */}
      <div className="font-sizes-toolbar">
        <div className="font-sizes-header">
          <Type className="w-3.5 h-3.5" />
          <span className="font-sizes-title">{isVa ? 'Mida de text:' : 'Tamaño texto:'}</span>
        </div>

        <div className="font-sizes-groups">
          {/* Títulos */}
          <div className="font-size-control" title={labels.titulosTip}>
            <span className="font-size-tag">{labels.titulos}:</span>
            <div className="font-size-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => onFontSizeNudge('titulos', -0.5)}
                title={isVa ? 'Reduir títols (-0.5pt)' : 'Reducir títulos (-0.5pt)'}
              >
                −
              </button>
              <input
                type="number"
                step="0.5"
                min="8"
                max="36"
                className="stepper-input"
                value={fontSizes.titulos}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onFontSizeSet('titulos', val);
                }}
              />
              <span className="stepper-unit">pt</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => onFontSizeNudge('titulos', 0.5)}
                title={isVa ? 'Augmentar títols (+0.5pt)' : 'Aumentar títulos (+0.5pt)'}
              >
                +
              </button>
            </div>
          </div>

          {/* Apartados */}
          <div className="font-size-control" title={labels.apartadosTip}>
            <span className="font-size-tag">{labels.apartados}:</span>
            <div className="font-size-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => onFontSizeNudge('apartados', -0.2)}
                title={isVa ? 'Reduir apartats (-0.2pt)' : 'Reducir apartados (-0.2pt)'}
              >
                −
              </button>
              <input
                type="number"
                step="0.2"
                min="7"
                max="28"
                className="stepper-input"
                value={fontSizes.apartados}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onFontSizeSet('apartados', val);
                }}
              />
              <span className="stepper-unit">pt</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => onFontSizeNudge('apartados', 0.2)}
                title={isVa ? 'Augmentar apartats (+0.2pt)' : 'Aumentar apartados (+0.2pt)'}
              >
                +
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="font-size-control" title={labels.contenidoTip}>
            <span className="font-size-tag">{labels.contenido}:</span>
            <div className="font-size-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => onFontSizeNudge('contenido', -0.2)}
                title={isVa ? 'Reduir contingut (-0.2pt)' : 'Reducir contenido (-0.2pt)'}
              >
                −
              </button>
              <input
                type="number"
                step="0.2"
                min="7"
                max="24"
                className="stepper-input"
                value={fontSizes.contenido}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onFontSizeSet('contenido', val);
                }}
              />
              <span className="stepper-unit">pt</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => onFontSizeNudge('contenido', 0.2)}
                title={isVa ? 'Augmentar contingut (+0.2pt)' : 'Aumentar contenido (+0.2pt)'}
              >
                +
              </button>
            </div>
          </div>

          {/* Instrucciones (solo exámenes) */}
          {section === 'examenes' && labels.instrucciones && (
            <div className="font-size-control" title={labels.instruccionesTip}>
              <span className="font-size-tag">{labels.instrucciones}:</span>
              <div className="font-size-stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => onFontSizeNudge('instrucciones', -0.2)}
                  title={isVa ? 'Reduir instruccions (-0.2pt)' : 'Reducir instrucciones (-0.2pt)'}
                >
                  −
                </button>
                <input
                  type="number"
                  step="0.2"
                  min="6"
                  max="20"
                  className="stepper-input"
                  value={fontSizes.instrucciones ?? 9.5}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onFontSizeSet('instrucciones', val);
                  }}
                />
                <span className="stepper-unit">pt</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => onFontSizeNudge('instrucciones', 0.2)}
                  title={isVa ? 'Augmentar instruccions (+0.2pt)' : 'Aumentar instrucciones (+0.2pt)'}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Botón de restablecer */}
          <button
            type="button"
            className="font-size-reset-btn"
            onClick={onResetFontSizes}
            title={isVa ? 'Restablir mides per defecte de la secció activa' : 'Restablecer tamaños por defecto de la sección activa'}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isVa ? 'Restablir' : 'Restablecer'}</span>
          </button>
        </div>
      </div>

      {/* Área del editor */}
      <div className="editor-textarea-wrapper">
        <textarea
          ref={textareaRef}
          className="markdown-textarea"
          value={markdown}
          onChange={(e) => onMarkdownChange(e.target.value)}
          placeholder={isVa ? "Introdueix ací el text Markdown..." : "Introduce aquí el texto Markdown..."}
          spellCheck={false}
        />
      </div>
    </div>
  );
};
