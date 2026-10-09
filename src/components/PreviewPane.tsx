import React from 'react';
import type { CompilationState, Language } from '../types';
import { Download, RefreshCw, AlertCircle, FileCheck } from 'lucide-react';

interface PreviewPaneProps {
  compilationState: CompilationState;
  filename: string;
  lang: Language;
  onRecompile: () => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  compilationState,
  filename,
  lang,
  onRecompile,
}) => {
  const isVa = lang === 'va';
  const { isCompiling, pdfBlobUrl, pdfBytes, error } = compilationState;

  const handleDownload = () => {
    if (!pdfBlobUrl || !pdfBytes) return;

    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="preview-pane">
      {/* Barra superior de acciones del visor */}
      <div className="preview-controls-bar">
        <div className="preview-file-info">
          <FileCheck className="w-4 h-4 text-emerald-700" />
          <span className="file-name" title={filename}>{filename}</span>
        </div>

        <div className="preview-actions">
          <button
            type="button"
            className="action-btn-small"
            onClick={onRecompile}
            disabled={isCompiling}
            title={isVa ? 'Recompilar document' : 'Recompilar documento'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCompiling ? 'spin' : ''}`} />
            <span>{isVa ? 'Actualitzar' : 'Actualizar'}</span>
          </button>

          <button
            type="button"
            className="btn-download"
            onClick={handleDownload}
            disabled={!pdfBlobUrl || isCompiling}
            title={isVa ? 'Descarregar PDF oficial' : 'Descargar PDF oficial'}
          >
            <Download className="w-4 h-4" />
            <span>{isVa ? 'Descarregar PDF' : 'Descargar PDF'}</span>
          </button>
        </div>
      </div>

      {/* Contenedor del visor de PDF */}
      <div className="preview-content-wrapper">
        {error && (
          <div className="preview-error-box">
            <div className="error-header">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <strong>{isVa ? 'Error en la compilació Typst' : 'Error en la compilación Typst'}</strong>
            </div>
            <pre className="error-message">{error}</pre>
          </div>
        )}

        {isCompiling && (
          <div className="preview-loading-overlay">
            <div className="loading-spinner"></div>
            <p>{isVa ? 'Generant PDF amb Typst WASM...' : 'Generando PDF con Typst WASM...'}</p>
          </div>
        )}

        {pdfBlobUrl ? (
          <iframe
            key={pdfBlobUrl}
            src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
            className="pdf-iframe"
            title="Vista previa del PDF"
          />
        ) : !isCompiling && !error ? (
          <div className="preview-empty-state">
            <p>{isVa ? 'Escriu o fes clic en Actualitzar per a generar el document.' : 'Escribe o pulsa en Actualizar para generar el documento.'}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
