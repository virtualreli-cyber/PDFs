export type SectionType = 'apuntes' | 'examenes' | 'tareas';

export type Language = 'es' | 'va';

export type ApuntesMode = 'extendido' | 'abreviado';

export type ExamenTipo = 'test' | 'mixto' | 'desarrollo';

export type ExamenDocType = 'examen' | 'solucionario';

export interface CompilationState {
  isCompiling: boolean;
  pdfBlobUrl: string | null;
  pdfBytes: Uint8Array | null;
  error: string | null;
  pageCount: number;
  lastCompiledAt: Date | null;
}
