import React from 'react';
import type { SectionType, Language } from '../types';
import { BookOpen, FileText, CheckSquare, Sparkles, FolderOpen } from 'lucide-react';

interface HeaderProps {
  currentSection: SectionType;
  onSectionChange: (section: SectionType) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  isCompiling: boolean;
  onOpenLibrary?: () => void;
  savedDocsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  onSectionChange,
  lang,
  onLangChange,
  isCompiling,
  onOpenLibrary,
  savedDocsCount = 0,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
        </div>
        <div className="brand-titles">
          <h1>{lang === 'va' ? 'Editorial Religió' : 'Editorial Religión'}</h1>
          <span className="brand-badge">PDF Studio</span>
        </div>
      </div>

      <nav className="header-nav">
        <button
          type="button"
          className={`nav-tab ${currentSection === 'apuntes' ? 'active' : ''}`}
          onClick={() => onSectionChange('apuntes')}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{lang === 'va' ? 'Apunts' : 'Apuntes'}</span>
        </button>

        <button
          type="button"
          className={`nav-tab ${currentSection === 'examenes' ? 'active' : ''}`}
          onClick={() => onSectionChange('examenes')}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{lang === 'va' ? 'Exàmens' : 'Exámenes'}</span>
        </button>

        <button
          type="button"
          className={`nav-tab ${currentSection === 'tareas' ? 'active' : ''}`}
          onClick={() => onSectionChange('tareas')}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>{lang === 'va' ? 'Tasques' : 'Tareas'}</span>
        </button>
      </nav>

      <div className="header-actions">
        {onOpenLibrary && (
          <button
            type="button"
            className="btn-header-library"
            onClick={onOpenLibrary}
            title={lang === 'va' ? 'Obrir la meua biblioteca de documents' : 'Abrir mi biblioteca de documentos'}
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-800" />
            <span>{lang === 'va' ? 'Biblioteca' : 'Mis Documentos'}</span>
            {savedDocsCount > 0 && <span className="header-library-badge">{savedDocsCount}</span>}
          </button>
        )}

        <div className="lang-switcher">
          <button
            type="button"
            className={`lang-btn ${lang === 'es' ? 'active' : ''}`}
            onClick={() => onLangChange('es')}
            title="Castellano"
          >
            ES
          </button>
          <button
            type="button"
            className={`lang-btn ${lang === 'va' ? 'active' : ''}`}
            onClick={() => onLangChange('va')}
            title="Valencià (AVL)"
          >
            VA
          </button>
        </div>

        <div className="status-indicator">
          {isCompiling ? (
            <span className="status-pill compiling">
              <span className="pulse-dot"></span>
              {lang === 'va' ? 'Compilant...' : 'Compilando...'}
            </span>
          ) : (
            <span className="status-pill ready">
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'va' ? 'WASM Actiu' : 'WASM Activo'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
