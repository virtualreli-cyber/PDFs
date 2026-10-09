import React, { useRef } from 'react';
import type { SectionType, Language, ApuntesMode, ExamenTipo, ExamenDocType } from '../types';
import { QuickInsertBar } from './QuickInsertBar';
import { RotateCcw, Trash2, Scissors, CheckCircle2 } from 'lucide-react';

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
  onLoadSample,
  onClear,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isVa = lang === 'va';

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
