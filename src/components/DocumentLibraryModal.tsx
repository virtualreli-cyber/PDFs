import React, { useState, useEffect, useRef } from 'react';
import type { SectionType, Language, ApuntesMode, ExamenTipo, ExamenDocType, ExamenVersion } from '../types';
import type { SavedDocument } from '../services/storageService';
import {
  listDocuments,
  saveDocument,
  deleteDocument,
  exportBackupJSON,
  importBackupJSON,
  downloadMarkdownFile,
} from '../services/storageService';
import {
  FolderOpen,
  Save,
  Download,
  Upload,
  Trash2,
  Copy,
  BookOpen,
  FileText,
  CheckSquare,
  Search,
  X,
  FileDown,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DocumentLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSection: SectionType;
  lang: Language;
  currentFilename: string;
  // Estado actual para guardar
  currentApuntesMd: string;
  currentApuntesMode: ApuntesMode;
  currentExamenVersions: ExamenVersion[];
  currentExamenTipo: ExamenTipo;
  currentExamenDocType: ExamenDocType;
  currentExamQuestionsPerPage: string;
  activeVersionId: string;
  currentTareasMd: string;
  // Callbacks para cargar documento en el editor
  onLoadDocument: (doc: SavedDocument) => void;
}

export const DocumentLibraryModal: React.FC<DocumentLibraryModalProps> = ({
  isOpen,
  onClose,
  currentSection,
  lang,
  currentFilename,
  currentApuntesMd,
  currentApuntesMode,
  currentExamenVersions,
  currentExamenTipo,
  currentExamenDocType,
  currentExamQuestionsPerPage,
  activeVersionId,
  currentTareasMd,
  onLoadDocument,
}) => {
  const isVa = lang === 'va';
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [filterSection, setFilterSection] = useState<SectionType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingCurrent, setIsSavingCurrent] = useState<boolean>(false);
  const [customSaveTitle, setCustomSaveTitle] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar lista de documentos
  const refreshDocuments = async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Error cargando documentos:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshDocuments();
      setFeedbackMsg(null);
      setIsSavingCurrent(false);
      setCustomSaveTitle('');
    }
  }, [isOpen]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3500);
  };

  // Helper para extraer título sugerido según sección actual
  const getSuggestedTitle = () => {
    let clean = currentFilename.replace(/\.pdf$/i, '').trim();
    if (clean.includes(' - ')) {
      const parts = clean.split(' - ');
      return parts[parts.length - 1];
    }
    return clean || (isVa ? 'Nou Document' : 'Nuevo Documento');
  };

  // Guardar documento actual en la biblioteca
  const handleSaveCurrent = async () => {
    try {
      const title = (customSaveTitle || getSuggestedTitle()).trim();
      let curso = '2º ESO';
      if (currentFilename.includes(' - 4E - ') || currentFilename.includes(' - 4t - ')) curso = '4º ESO';
      else if (currentFilename.includes(' - 1B - ') || currentFilename.includes(' - 1r Batx - ')) curso = '1º Bach';
      else if (currentFilename.includes(' - 2B - ')) curso = '2º Bach';
      else if (currentFilename.includes(' - 3E - ')) curso = '3º ESO';
      else if (currentFilename.includes(' - 1E - ')) curso = '1º ESO';

      let docPayload: Omit<SavedDocument, 'id' | 'createdAt' | 'updatedAt'> = {
        section: currentSection,
        titulo: title,
        curso,
        lang,
      };

      if (currentSection === 'apuntes') {
        docPayload.apuntesData = {
          markdown: currentApuntesMd,
          mode: currentApuntesMode,
        };
      } else if (currentSection === 'examenes') {
        docPayload.examenesData = {
          tipo: currentExamenTipo,
          docType: currentExamenDocType,
          questionsPerPage: currentExamQuestionsPerPage,
          versions: currentExamenVersions,
          activeVersionId: activeVersionId,
        };
      } else {
        docPayload.tareasData = {
          markdown: currentTareasMd,
        };
      }

      await saveDocument(docPayload);
      setIsSavingCurrent(false);
      setCustomSaveTitle('');
      await refreshDocuments();
      showNotification(isVa ? 'Document guardat correctament a la biblioteca!' : '¡Documento guardado correctamente en la biblioteca!');
    } catch (err: any) {
      console.error('Error guardando documento:', err);
      showNotification(isVa ? 'Error en guardar el document' : 'Error al guardar el documento', 'error');
    }
  };

  // Cargar documento en el editor
  const handleLoad = (doc: SavedDocument) => {
    onLoadDocument(doc);
    onClose();
  };

  // Duplicar documento existente
  const handleDuplicate = async (doc: SavedDocument) => {
    try {
      const copyDoc: Omit<SavedDocument, 'id' | 'createdAt' | 'updatedAt'> = {
        section: doc.section,
        titulo: `${doc.titulo} (${isVa ? 'Còpia' : 'Copia'})`,
        curso: doc.curso,
        lang: doc.lang,
        apuntesData: doc.apuntesData,
        examenesData: doc.examenesData,
        tareasData: doc.tareasData,
      };
      await saveDocument(copyDoc);
      await refreshDocuments();
      showNotification(isVa ? 'Document duplicat amb èxit' : 'Documento duplicado con éxito');
    } catch (err) {
      console.error('Error duplicando:', err);
      showNotification(isVa ? 'Error en duplicar el document' : 'Error al duplicar el documento', 'error');
    }
  };

  // Eliminar documento
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = isVa
      ? 'Segur que vols eliminar este document de la biblioteca?'
      : '¿Seguro que deseas eliminar este documento de tu biblioteca?';
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDocument(id);
      await refreshDocuments();
      showNotification(isVa ? 'Document eliminat' : 'Documento eliminado');
    } catch (err) {
      console.error('Error eliminando:', err);
    }
  };

  // Exportar backup completo en JSON
  const handleExportBackup = async () => {
    try {
      const jsonStr = await exportBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `editorial_religio_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showNotification(isVa ? 'Còpia de seguretat descarregada' : 'Copia de seguridad descargada');
    } catch (err) {
      console.error('Error exportando backup:', err);
      showNotification(isVa ? 'Error en exportar còpia' : 'Error al exportar copia', 'error');
    }
  };

  // Importar backup JSON
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importBackupJSON(text);
      await refreshDocuments();
      showNotification(
        isVa
          ? `S'han restaurat ${result.importedCount} documents amb èxit!`
          : `¡Se han restaurado ${result.importedCount} documentos con éxito!`
      );
    } catch (err: any) {
      console.error('Error importando backup:', err);
      showNotification(err?.message || (isVa ? 'Fitxer de còpia invàlid' : 'Archivo de copia no válido'), 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Descargar Markdown individual del documento actual
  const handleDownloadCurrentMd = () => {
    let md = currentTareasMd;
    if (currentSection === 'apuntes') md = currentApuntesMd;
    else if (currentSection === 'examenes') {
      const activeV = currentExamenVersions.find((v) => v.id === activeVersionId) || currentExamenVersions[0];
      md = activeV?.markdown || '';
    }
    downloadMarkdownFile(md, currentFilename);
    showNotification(isVa ? 'Arxiu .md descarregat' : 'Archivo .md descargado');
  };

  // Filtrado de documentos
  const filteredDocuments = documents.filter((doc) => {
    const matchesSection = filterSection === 'all' || doc.section === filterSection;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      doc.titulo.toLowerCase().includes(term) ||
      doc.curso.toLowerCase().includes(term) ||
      doc.section.toLowerCase().includes(term);
    return matchesSection && matchesSearch;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMins = Math.floor((now - timestamp) / 60000);
    if (diffMins < 1) return isVa ? 'Ara mateix' : 'Ahora mismo';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h`;
    return date.toLocaleDateString(isVa ? 'ca-ES' : 'es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card library-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del modal */}
        <div className="modal-header">
          <div className="modal-title-group">
            <FolderOpen className="w-5 h-5 text-emerald-800" />
            <h3 className="modal-title">
              {isVa ? 'La meua Biblioteca de Documents' : 'Mi Biblioteca de Documentos'}
            </h3>
            <span className="library-count-pill">{documents.length}</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notificación de feedback */}
        {feedbackMsg && (
          <div className={`library-feedback ${feedbackMsg.type}`}>
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Barra superior de herramientas y acciones */}
        <div className="library-toolbar">
          <div className="library-quick-actions">
            {!isSavingCurrent ? (
              <button
                type="button"
                className="btn-library-action primary"
                onClick={() => {
                  setCustomSaveTitle(getSuggestedTitle());
                  setIsSavingCurrent(true);
                }}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isVa ? 'Guardar este document' : 'Guardar este documento'}</span>
              </button>
            ) : (
              <div className="library-save-inline">
                <input
                  type="text"
                  className="library-title-input"
                  value={customSaveTitle}
                  onChange={(e) => setCustomSaveTitle(e.target.value)}
                  placeholder={isVa ? 'Nom del tema...' : 'Nombre del tema...'}
                  autoFocus
                />
                <button type="button" className="btn-icon-save-confirm" onClick={handleSaveCurrent}>
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="btn-icon-save-cancel"
                  onClick={() => setIsSavingCurrent(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              className="btn-library-action secondary"
              onClick={handleDownloadCurrentMd}
              title={isVa ? 'Descarregar fitxer .md en el disc dur' : 'Descargar archivo .md en tu disco'}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isVa ? 'Exportar .md' : 'Exportar .md'}</span>
            </button>

            <button
              type="button"
              className="btn-library-action secondary"
              onClick={handleExportBackup}
              title={isVa ? 'Descarregar còpia completa de seguretat en JSON' : 'Descargar copia completa de seguridad en JSON'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isVa ? 'Còpia JSON' : 'Copia JSON'}</span>
            </button>

            <button
              type="button"
              className="btn-library-action secondary"
              onClick={() => fileInputRef.current?.click()}
              title={isVa ? 'Restaurar còpia de seguretat en JSON' : 'Restaurar copia de seguridad en JSON'}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isVa ? 'Restaurar' : 'Restaurar'}</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportBackup}
            />
          </div>
        </div>

        {/* Pestañas de filtrado y buscador */}
        <div className="library-filter-row">
          <div className="library-tabs">
            <button
              type="button"
              className={`library-tab ${filterSection === 'all' ? 'active' : ''}`}
              onClick={() => setFilterSection('all')}
            >
              {isVa ? 'Tots' : 'Todos'} ({documents.length})
            </button>
            <button
              type="button"
              className={`library-tab ${filterSection === 'apuntes' ? 'active' : ''}`}
              onClick={() => setFilterSection('apuntes')}
            >
              <BookOpen className="w-3 h-3" />
              {isVa ? 'Apunts' : 'Apuntes'}
            </button>
            <button
              type="button"
              className={`library-tab ${filterSection === 'examenes' ? 'active' : ''}`}
              onClick={() => setFilterSection('examenes')}
            >
              <FileText className="w-3 h-3" />
              {isVa ? 'Exàmens' : 'Exámenes'}
            </button>
            <button
              type="button"
              className={`library-tab ${filterSection === 'tareas' ? 'active' : ''}`}
              onClick={() => setFilterSection('tareas')}
            >
              <CheckSquare className="w-3 h-3" />
              {isVa ? 'Tasques' : 'Tareas'}
            </button>
          </div>

          <div className="library-search-box">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={isVa ? 'Buscar per títol o curs...' : 'Buscar por título o curso...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="search-clear-btn" onClick={() => setSearchTerm('')}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de documentos */}
        <div className="library-doc-list">
          {filteredDocuments.length === 0 ? (
            <div className="library-empty-state">
              <Sparkles className="w-8 h-8 text-emerald-600 mb-2" />
              <h4>{isVa ? 'Encara no hi ha documents guardats' : 'Aún no hay documentos guardados'}</h4>
              <p>
                {isVa
                  ? 'Guarda els teus apunts, exàmens amb totes les versions o tasques per a recuperar-los en qualsevol moment.'
                  : 'Guarda tus apuntes, exámenes con todas sus versiones o tareas para recuperarlos en cualquier momento.'}
              </p>
              <button
                type="button"
                className="btn-library-action primary mt-3"
                onClick={() => {
                  setCustomSaveTitle(getSuggestedTitle());
                  setIsSavingCurrent(true);
                }}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isVa ? 'Guardar document actual ara' : 'Guardar documento actual ahora'}</span>
              </button>
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const isApuntes = doc.section === 'apuntes';
              const isExamenes = doc.section === 'examenes';
              const versionsCount = doc.examenesData?.versions?.length || 1;

              return (
                <div key={doc.id} className="library-doc-card" onClick={() => handleLoad(doc)}>
                  <div className="doc-card-main">
                    <div className="doc-card-header">
                      <span className={`doc-section-pill ${doc.section}`}>
                        {isApuntes && <BookOpen className="w-3 h-3" />}
                        {isExamenes && <FileText className="w-3 h-3" />}
                        {!isApuntes && !isExamenes && <CheckSquare className="w-3 h-3" />}
                        <span>
                          {isApuntes
                            ? isVa ? 'Apunts' : 'Apuntes'
                            : isExamenes
                            ? isVa ? 'Examen' : 'Examen'
                            : isVa ? 'Tasques' : 'Tareas'}
                        </span>
                      </span>

                      <span className="doc-meta-badge curso">{doc.curso}</span>
                      <span className="doc-meta-badge lang">{doc.lang.toUpperCase()}</span>

                      {isExamenes && (
                        <span className="doc-meta-badge extra">
                          {versionsCount} {versionsCount === 1 ? (isVa ? 'versió' : 'versión') : isVa ? 'versions' : 'versiones'}
                        </span>
                      )}

                      {isApuntes && doc.apuntesData && (
                        <span className="doc-meta-badge extra">
                          {doc.apuntesData.mode === 'abreviado'
                            ? isVa ? 'Abreviat' : 'Abreviado'
                            : isVa ? 'Estés' : 'Extendido'}
                        </span>
                      )}
                    </div>

                    <h4 className="doc-card-title">{doc.titulo}</h4>

                    <div className="doc-card-footer">
                      <span className="doc-card-date">
                        <Clock className="w-3 h-3" />
                        {formatDate(doc.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="doc-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn-doc-action open"
                      onClick={() => handleLoad(doc)}
                      title={isVa ? 'Obrir en l\'editor' : 'Abrir en el editor'}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{isVa ? 'Obrir' : 'Abrir'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-doc-icon"
                      onClick={() => handleDuplicate(doc)}
                      title={isVa ? 'Duplicar document' : 'Duplicar documento'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      className="btn-doc-icon delete"
                      onClick={(e) => handleDelete(doc.id, e)}
                      title={isVa ? 'Eliminar document' : 'Eliminar documento'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
