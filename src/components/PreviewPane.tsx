import React, { useState } from 'react';
import type { CompilationState, Language, SectionType, ExamenDocType } from '../types';
import {
  Download,
  RefreshCw,
  AlertCircle,
  FileCheck,
  RotateCcw,
  CheckCircle2,
  X,
  Printer,
  Layers,
} from 'lucide-react';

interface PreviewPaneProps {
  section: SectionType;
  examenDocType?: ExamenDocType;
  compilationState: CompilationState;
  filename: string;
  isCustomFilename: boolean;
  onFilenameChange: (newFilename: string) => void;
  onResetFilename: () => void;
  lang: Language;
  hasPendingChanges: boolean;
  onRecompile: () => void;
  onDownloadSoluciones?: () => Promise<void>;
  onPrint?: () => void;
  hasMultipleVersions?: boolean;
  onDownloadAllVersions?: () => Promise<void>;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  section,
  examenDocType,
  compilationState,
  filename,
  isCustomFilename,
  onFilenameChange,
  onResetFilename,
  lang,
  hasPendingChanges,
  onRecompile,
  onDownloadSoluciones,
  onPrint,
  hasMultipleVersions,
  onDownloadAllVersions,
}) => {
  const isVa = lang === 'va';
  const { isCompiling, pdfBlobUrl, pdfBytes, error } = compilationState;
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);

  const downloadCurrentPdf = () => {
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

  const handleDownloadClick = () => {
    if (!pdfBlobUrl || isCompiling) return;

    // Si estamos en la vista de examen (y no es el solucionario ya seleccionado)
    if (section === 'examenes' && examenDocType === 'examen') {
      setShowDownloadModal(true);
    } else {
      downloadCurrentPdf();
    }
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

        {/* Acciones de compilación y descarga */}
        <div className="preview-actions">
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

          {/* Botón Imprimir */}
          {onPrint && (
            <button
              type="button"
              className="action-btn-small"
              onClick={onPrint}
              disabled={!pdfBlobUrl || isCompiling}
              title={section === 'examenes'
                ? (isVa ? "Imprimir versió (examen + solucionari oficial adaptat)" : "Imprimir versión (examen + solucionario oficial adaptado)")
                : (isVa ? "Imprimir document" : "Imprimir documento")
              }
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>{isVa ? 'Imprimir' : 'Imprimir'}</span>
            </button>
          )}

          {/* Botón Descargar */}
          <button
            type="button"
            className="btn-download"
            onClick={handleDownloadClick}
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
            <iframe
              src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
              className="pdf-iframe"
              title="Vista previa del PDF"
            />
          </div>
        ) : !isCompiling && !error ? (
          <div className="preview-empty-state">
            <p>{isVa ? 'Fes clic en Actualitzar per a generar la vista prèvia del document.' : 'Pulsa en Actualizar para generar la vista previa del documento.'}</p>
          </div>
        ) : null}
      </div>

      {/* Modal / Popup de descarga en exámenes: ¿Descargar también soluciones? */}
      {showDownloadModal && (
        <div className="modal-backdrop" onClick={() => setShowDownloadModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Download className="w-5 h-5 text-emerald-700" />
                <h3 className="modal-title">
                  {isVa ? 'Vols descarregar també les solucions?' : '¿Descargar también las soluciones?'}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowDownloadModal(false)}
                title={isVa ? 'Tancar' : 'Cerrar'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="modal-description">
              {isVa
                ? "Pots descarregar únicament l'examen oficial per a l'alumnat o generar i descarregar simultàniament les solucions oficials docents en un fitxer PDF independent."
                : 'Puedes descargar únicamente el examen oficial para el alumnado o generar y descargar simultáneamente las soluciones oficiales docentes en un archivo PDF independiente.'}
            </p>

            <div className="modal-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className="modal-btn-secondary"
                onClick={() => {
                  setShowDownloadModal(false);
                  downloadCurrentPdf();
                }}
              >
                {isVa ? "Només l'examen" : 'Solo el examen'}
              </button>

              <button
                type="button"
                className="modal-btn-primary"
                onClick={async () => {
                  setShowDownloadModal(false);
                  downloadCurrentPdf();
                  if (onDownloadSoluciones) {
                    setTimeout(async () => {
                      await onDownloadSoluciones();
                    }, 400);
                  }
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isVa ? 'Examen + Solucions' : 'Examen + Soluciones'}</span>
              </button>

              {hasMultipleVersions && onDownloadAllVersions && (
                <button
                  type="button"
                  className="modal-btn-primary"
                  style={{ background: '#354F52', borderColor: '#2F3E46' }}
                  onClick={async () => {
                    setShowDownloadModal(false);
                    await onDownloadAllVersions();
                  }}
                  title={isVa ? "Descarregar totes les versions generades amb els seus respectius solucionaris" : "Descargar todas las versiones generadas con sus respectivos solucionarios"}
                >
                  <Layers className="w-4 h-4" />
                  <span>{isVa ? 'Totes les versions + Solucions' : 'Todas las versiones + Soluciones'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
