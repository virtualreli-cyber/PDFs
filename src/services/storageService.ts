import type { SectionType, Language, ApuntesMode, ExamenTipo, ExamenDocType, ExamenVersion } from '../types';

export interface SavedDocument {
  id: string;
  section: SectionType;
  titulo: string;
  curso: string;
  lang: Language;
  createdAt: number;
  updatedAt: number;
  apuntesData?: {
    markdown: string;
    mode: ApuntesMode;
  };
  examenesData?: {
    tipo: ExamenTipo;
    docType: ExamenDocType;
    questionsPerPage: string;
    versions: ExamenVersion[];
    activeVersionId: string;
  };
  tareasData?: {
    markdown: string;
  };
}

export interface SectionDraft {
  section: SectionType;
  updatedAt: number;
  lang: Language;
  apuntesData?: {
    markdown: string;
    mode: ApuntesMode;
  };
  examenesData?: {
    tipo: ExamenTipo;
    docType: ExamenDocType;
    questionsPerPage: string;
    versions: ExamenVersion[];
    activeVersionId: string;
  };
  tareasData?: {
    markdown: string;
  };
}

const DB_NAME = 'EditorialReligioDB';
const DB_VERSION = 1;
const STORE_DOCUMENTS = 'documents';
const STORE_DRAFTS = 'drafts';

let dbInstance: IDBDatabase | null = null;

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB no está disponible en este entorno.');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        const docStore = db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('section', 'section', { unique: false });
        docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'section' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('No se pudo abrir la base de datos IndexedDB'));
    };
  });
}

// =============================================================================
// BORRADORES EN TIEMPO REAL (AUTO-GUARDADO)
// =============================================================================

export async function saveDraft(draft: SectionDraft): Promise<void> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DRAFTS, 'readwrite');
        const store = tx.objectStore(STORE_DRAFTS);
        const req = store.put({ ...draft, updatedAt: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    console.warn('Fallback a localStorage para borrador:', err);
  }

  // Fallback seguro a localStorage
  try {
    localStorage.setItem(`editorial_draft_${draft.section}`, JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch (e) {
    console.error('Error guardando borrador en localStorage:', e);
  }
}

export async function loadDraft(section: SectionType): Promise<SectionDraft | null> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DRAFTS, 'readonly');
        const store = tx.objectStore(STORE_DRAFTS);
        const req = store.get(section);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    console.warn('Fallback a localStorage para leer borrador:', err);
  }

  try {
    const raw = localStorage.getItem(`editorial_draft_${section}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo borrador de localStorage:', e);
  }
  return null;
}

// =============================================================================
// BIBLIOTECA DE DOCUMENTOS GUARDADOS (MIS DOCUMENTOS)
// =============================================================================

export async function saveDocument(
  doc: Omit<SavedDocument, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<SavedDocument> {
  const now = Date.now();
  const id = doc.id || `doc_${now}_${Math.random().toString(36).substring(2, 8)}`;
  const finalDoc: SavedDocument = {
    ...doc,
    id,
    createdAt: (doc as any).createdAt || now,
    updatedAt: now,
  };

  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
        const store = tx.objectStore(STORE_DOCUMENTS);
        const req = store.put(finalDoc);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      return finalDoc;
    }
  } catch (err) {
    console.warn('Fallback a localStorage para guardar documento:', err);
  }

  // Fallback en localStorage
  try {
    const all = await listDocumentsFallback();
    const existingIdx = all.findIndex((d) => d.id === id);
    if (existingIdx !== -1) {
      all[existingIdx] = finalDoc;
    } else {
      all.push(finalDoc);
    }
    localStorage.setItem('editorial_saved_documents', JSON.stringify(all));
  } catch (e) {
    console.error('Error guardando documento en fallback:', e);
  }

  return finalDoc;
}

export async function listDocuments(section?: SectionType): Promise<SavedDocument[]> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
        const store = tx.objectStore(STORE_DOCUMENTS);
        const req = store.getAll();
        req.onsuccess = () => {
          let docs: SavedDocument[] = req.result || [];
          if (section) {
            docs = docs.filter((d) => d.section === section);
          }
          // Ordenar por última modificación descendente
          docs.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(docs);
        };
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    console.warn('Fallback a localStorage para listar documentos:', err);
  }

  const fallbackDocs = await listDocumentsFallback();
  if (section) {
    return fallbackDocs.filter((d) => d.section === section).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return fallbackDocs.sort((a, b) => b.updatedAt - a.updatedAt);
}

function listDocumentsFallback(): Promise<SavedDocument[]> {
  try {
    const raw = localStorage.getItem('editorial_saved_documents');
    if (raw) return Promise.resolve(JSON.parse(raw));
  } catch (e) {
    console.error('Error listando documentos fallback:', e);
  }
  return Promise.resolve([]);
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
        const store = tx.objectStore(STORE_DOCUMENTS);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      return;
    }
  } catch (err) {
    console.warn('Fallback a localStorage para borrar documento:', err);
  }

  try {
    const all = await listDocumentsFallback();
    const filtered = all.filter((d) => d.id !== id);
    localStorage.setItem('editorial_saved_documents', JSON.stringify(filtered));
  } catch (e) {
    console.error('Error borrando documento en fallback:', e);
  }
}

// =============================================================================
// COPIA DE SEGURIDAD (EXPORTAR E IMPORTAR JSON)
// =============================================================================

export async function exportBackupJSON(): Promise<string> {
  const allDocs = await listDocuments();
  const backupData = {
    app: 'EditorialReligioPDFStudio',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    documentsCount: allDocs.length,
    documents: allDocs,
  };
  return JSON.stringify(backupData, null, 2);
}

export async function importBackupJSON(jsonStr: string): Promise<{ importedCount: number }> {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || !Array.isArray(parsed.documents)) {
    throw new Error('El archivo no contiene un formato de copia de seguridad válido.');
  }

  const docsToImport: SavedDocument[] = parsed.documents;
  let count = 0;

  for (const doc of docsToImport) {
    if (doc.id && doc.section && doc.titulo) {
      await saveDocument(doc);
      count++;
    }
  }

  return { importedCount: count };
}

// =============================================================================
// DESCARGA INDIVIDUAL DE ARCHIVO MARKDOWN (.MD)
// =============================================================================

export function downloadMarkdownFile(markdown: string, filename: string): void {
  let cleanName = filename.trim();
  if (cleanName.toLowerCase().endsWith('.pdf')) {
    cleanName = cleanName.substring(0, cleanName.length - 4);
  }
  if (!cleanName.toLowerCase().endsWith('.md')) {
    cleanName += '.md';
  }

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
