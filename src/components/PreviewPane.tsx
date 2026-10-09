import React, { useState } from 'react';
import type { CompilationState, Language } from '../types';
import {
  Download,
  RefreshCw,
  AlertCircle,
  FileCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface PreviewPaneProps {
  compilationState: CompilationState;
  filename: string;
  isCustomFilename: boolean;
  onFilenameChange: (newFilename: string) => void;
  onResetFilename: () => void;
  lang: Language;
  hasPendingChanges: boolean;
  onRecompile: () => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  compilationState,
  filename,
  isCustomFilename,
  onFilenameChange,
  onResetFilename,
  lang,
  hasPendingChanges,
  onRecompile,
}) => {
  const isVa = lang === 'va';
  const { isCompiling, pdfBlobUrl, pdfBytes, error } = compilationState;
  const [zoom, setZoom] = useState<number>(100);
  const [page, setPage] = useState<number>(1);

  const handleDownload = () => {
    if (!pdfBlobUrl || !pdfBytes) return;

    let finalName = filename.trim();
    if (!finalName.toLowerCase().endsWith('.pdf')) {
      finalName += '.pdf';
    }

    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.max(50, Math.min(200, newZoom));
    setZoom(clamped);
  };

  return (
    <div className="preview-pane">
      {/* Barra superior de controles */}
      <div className="preview-controls-bar">
        {/* Nombre de archivo editable */}
        <div className="preview-file-info">
          <FileCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <input
            type="text"
            className="file-name-input"
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            title={isVa ? 'Editar el nom del fitxer PDF' : 'Editar el nombre del archivo PDF'}
            placeholder="nombre-del-archivo.pdf"
          />
          {isCustomFilename && (
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={onResetFilename}
              title={isVa ? 'Restablir nom oficial canònic' : 'Restablecer nombre oficial canónico'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>

        {/* Acciones de visualización y compilación */}
        <div className="preview-actions">
          {/* Navegación rápida de página */}
          <div className="preview-page-group">
            <button
              type="button"
              className="zoom-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              title={isVa ? 'Pàgina anterior' : 'Página anterior'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="page-indicator">
              {isVa ? 'Pàg.' : 'Pág.'} {page}
            </span>
            <button
              type="button"
              className="zoom-btn"
              onClick={() => setPage((p) => p + 1)}
              title={isVa ? 'Pàgina següent' : 'Página siguiente'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Controles de Zoom */}
          <div className="preview-zoom-group">
            <button
              type="button"
              className="zoom-btn"
              onClick={() => handleZoomChange(zoom - 15)}
              disabled={zoom <= 50}
              title={isVa ? 'Reduir zoom' : 'Reducir zoom'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className="zoom-level-btn"
              onClick={() => handleZoomChange(100)}
              title={isVa ? 'Restablir al 100%' : 'Restablecer al 100%'}
            >
              {zoom}%
            </button>
            <button
              type="button"
              className="zoom-btn"
              onClick={() => handleZoomChange(zoom + 15)}
              disabled={zoom >= 200}
              title={isVa ? 'Augmentar zoom' : 'Aumentar zoom'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className="zoom-btn"
              onClick={() => handleZoomChange(100)}
              title={isVa ? 'Ajustar visualització' : 'Ajustar visualización'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botón Actualizar (Único activador de compilación) */}
          <button
            type="button"
            className={`action-btn-small ${hasPendingChanges ? 'btn-pending-changes' : ''}`}
            onClick={onRecompile}
            disabled={isCompiling}
            title={isVa ? 'Actualitzar vista prèvia' : 'Actualizar vista previa'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCompiling ? 'spin' : ''}`} />
            <span>
              {isCompiling
                ? (isVa ? 'Compilant...' : 'Compilando...')
                : hasPendingChanges
                ? (isVa ? '● Actualitzar' : '● Actualizar')
                : (isVa ? 'Actualitzar' : 'Actualizar')}
            </span>
          </button>

          {/* Botón Descargar */}
          <button
            type="button"
            className="btn-download"
            onClick={handleDownload}
            disabled={!pdfBlobUrl || isCompiling}
            title={isVa ? 'Descarregar PDF' : 'Descargar PDF'}
          >
            <Download className="w-4 h-4" />
            <span>{isVa ? 'Descarregar' : 'Descargar'}</span>
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
          <div className="pdf-viewport">
            <div
              className="pdf-scale-container"
              style={{
                width: zoom > 100 ? `${zoom}%` : '100%',
                height: zoom > 100 ? `${zoom}%` : '100%',
                minHeight: '100%',
                transform: zoom < 100 ? `scale(${zoom / 100})` : 'none',
                transformOrigin: 'top center',
                transition: 'transform 0.12s ease-out',
              }}
            >
              <iframe
                src={`${pdfBlobUrl}#page=${page}&zoom=${zoom}&toolbar=1&navpanes=0`}
                className="pdf-iframe"
                title="Vista previa del PDF"
              />
            </div>
          </div>
        ) : !isCompiling && !error ? (
          <div className="preview-empty-state">
            <p>{isVa ? 'Fes clic en Actualitzar per a generar la vista prèvia del document.' : 'Pulsa en Actualizar para generar la vista previa del documento.'}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
