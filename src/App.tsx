import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SectionType, Language, ApuntesMode, ExamenTipo, ExamenDocType, CompilationState } from './types';
import { Header } from './components/Header';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { generateApuntesTypst } from './generators/apuntesGenerator';
import { generateExamenTypst } from './generators/examenesGenerator';
import { generateTareasTypst } from './generators/tareasGenerator';
import { compileTypstToPdf } from './services/typstCompiler';
import {
  SAMPLE_APUNTES_ES,
  SAMPLE_APUNTES_VA,
  SAMPLE_EXAMEN_TEST_ES,
  SAMPLE_EXAMEN_MIXTO_ES,
  SAMPLE_EXAMEN_DESARROLLO_ES,
  SAMPLE_TAREAS_ES,
  SAMPLE_TAREAS_VA,
} from './templates/sampleMarkdown';
import './App.css';

export function App() {
  const [section, setSection] = useState<SectionType>('apuntes');
  const [lang, setLang] = useState<Language>('es');

  // Estados específicos de Apuntes
  const [apuntesMode, setApuntesMode] = useState<ApuntesMode>('extendido');
  const [apuntesMd, setApuntesMd] = useState<string>(SAMPLE_APUNTES_ES);

  // Estados específicos de Exámenes
  const [examenTipo, setExamenTipo] = useState<ExamenTipo>('test');
  const [examenDocType, setExamenDocType] = useState<ExamenDocType>('examen');
  const [examQuestionsPerPage, setExamQuestionsPerPage] = useState<string>('10, 10');
  const [examenesMd, setExamenesMd] = useState<string>(SAMPLE_EXAMEN_TEST_ES);

  // Estados específicos de Tareas
  const [tareasMd, setTareasMd] = useState<string>(SAMPLE_TAREAS_ES);

  // Nombre de archivo personalizado (si el usuario lo edita)
  const [customFilename, setCustomFilename] = useState<string | null>(null);

  // Estado de compilación y visor
  const [compilationState, setCompilationState] = useState<CompilationState>({
    isCompiling: false,
    pdfBlobUrl: null,
    pdfBytes: null,
    error: null,
    pageCount: 1,
    lastCompiledAt: null,
  });

  // Código Typst de la última compilación exitosa
  const [lastCompiledTypst, setLastCompiledTypst] = useState<string>('');

  const activeBlobUrlRef = useRef<string | null>(null);

  // Obtener texto markdown actual según la sección activa
  const currentMarkdown = section === 'apuntes' ? apuntesMd : section === 'examenes' ? examenesMd : tareasMd;

  // Manejar cambio de texto en el editor (NO recompila automáticamente)
  const handleMarkdownChange = (newText: string) => {
    if (section === 'apuntes') setApuntesMd(newText);
    else if (section === 'examenes') setExamenesMd(newText);
    else setTareasMd(newText);
  };

  // Calcular nombre de archivo canónico oficial
  const canonicalFilename = useMemo((): string => {
    const isVa = lang === 'va';
    const langCode = isVa ? 'V' : 'C';

    if (section === 'apuntes') {
      const isAbrev = apuntesMode === 'abreviado';
      const suffix = isAbrev ? (isVa ? ' Abreviat' : ' Abreviado') : '';
      return `AP - 4E - ${langCode} - La dignidad humana${suffix}.pdf`;
    }

    if (section === 'examenes') {
      const tipoStr = examenTipo === 'test' ? 'Test' : examenTipo === 'mixto' ? 'Mixto' : 'Desarrollo';
      const solStr = examenDocType === 'solucionario' ? (isVa ? ' - Solucionari' : ' - Solucionario') : '';
      return `EX - 2E - ${langCode} - Justicia Social - ${tipoStr}${solStr}.pdf`;
    }

    // Tareas
    return `TA - 2E - ${langCode} - Historia de la Iglesia Primitiva - Dossier de tareas.pdf`;
  }, [section, lang, apuntesMode, examenTipo, examenDocType]);

  // Nombre efectivo: personalizado o canónico
  const effectiveFilename = customFilename !== null ? customFilename : canonicalFilename;

  // Generador de código Typst según estado actual
  const buildTypstSource = useCallback((): string => {
    if (section === 'apuntes') {
      return generateApuntesTypst(apuntesMd, apuntesMode, lang);
    }
    if (section === 'examenes') {
      return generateExamenTypst(examenesMd, examenTipo, examenDocType, lang, examQuestionsPerPage);
    }
    return generateTareasTypst(tareasMd, lang);
  }, [section, apuntesMd, apuntesMode, examenesMd, examenTipo, examenDocType, tareasMd, lang, examQuestionsPerPage]);

  // Código Typst actual
  const currentTypstCode = buildTypstSource();

  // Hay cambios pendientes sin compilar
  const hasPendingChanges = lastCompiledTypst !== '' && currentTypstCode !== lastCompiledTypst && !compilationState.isCompiling;

  // Función de compilación a PDF bajo demanda
  const triggerCompilation = useCallback(async () => {
    setCompilationState((prev) => ({ ...prev, isCompiling: true, error: null }));

    try {
      const typstCode = buildTypstSource();
      const pdfBytes = await compileTypstToPdf(typstCode);

      // Crear nuevo Blob URL
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const newBlobUrl = URL.createObjectURL(blob);

      // Revocar URL anterior para evitar fugas de memoria
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
      activeBlobUrlRef.current = newBlobUrl;

      setLastCompiledTypst(typstCode);
      setCompilationState({
        isCompiling: false,
        pdfBlobUrl: newBlobUrl,
        pdfBytes,
        error: null,
        pageCount: 1,
        lastCompiledAt: new Date(),
      });
    } catch (err: any) {
      console.error('Error al compilar documento:', err);
      setCompilationState((prev) => ({
        ...prev,
        isCompiling: false,
        error: err?.message || 'Error desconocido al compilar Typst',
      }));
    }
  }, [buildTypstSource]);

  // Compilar únicamente en la carga inicial de la aplicación
  useEffect(() => {
    triggerCompilation();
  }, []);

  // Cargar ejemplo para la sección activa
  const handleLoadSample = () => {
    const isVa = lang === 'va';
    if (section === 'apuntes') {
      setApuntesMd(isVa ? SAMPLE_APUNTES_VA : SAMPLE_APUNTES_ES);
    } else if (section === 'examenes') {
      if (examenTipo === 'test') setExamenesMd(SAMPLE_EXAMEN_TEST_ES);
      else if (examenTipo === 'mixto') setExamenesMd(SAMPLE_EXAMEN_MIXTO_ES);
      else setExamenesMd(SAMPLE_EXAMEN_DESARROLLO_ES);
    } else {
      setTareasMd(isVa ? SAMPLE_TAREAS_VA : SAMPLE_TAREAS_ES);
    }
    setCustomFilename(null);
  };

  // Limpiar editor
  const handleClear = () => {
    handleMarkdownChange('');
  };

  // Condensar apuntes automáticamente (reducción >= 30% determinista)
  const handleCondenseApuntes = () => {
    let condensed = apuntesMd
      .replace(/> 💡 \*\*\[EJEMPLO.*?\]\*\*:?[\s\S]*?(?=\n\n|\n#|$)/gi, '')
      .replace(/> 💡 \*\*\[EXEMPLE.*?\]\*\*:?[\s\S]*?(?=\n\n|\n#|$)/gi, '')
      .replace(/> 🏛️ \*\*\[UN DATO.*?\]\*\*:?[\s\S]*?(?=\n\n|\n#|$)/gi, '')
      .replace(/> 🎨 \*\*\[ARTE.*?\]\*\*:?[\s\S]*?(?=\n\n|\n#|$)/gi, '')
      .replace(/> 👤 \*\*\[UN TESTIMONIO.*?\]\*\*:?[\s\S]*?(?=\n\n|\n#|$)/gi, '')
      .replace(/> ❓ \*\*\[¿SABÍAS.*?\]\*\*:?[\s\S]*?(?=\n\n|\n#|$)/gi, '')
      .replace(/<!-- solo-extendido -->[\s\S]*?<!-- fin-extendido -->/gi, '');

    const lines = condensed.split('\n');
    const filteredLines = lines.filter((l) => {
      if (l.startsWith('#') || l.startsWith('>') || l.startsWith('-') || l.trim() === '---') return true;
      return l.length < 320;
    });

    setApuntesMd(filteredLines.join('\n'));
    setApuntesMode('abreviado');
  };

  // Sincronizar plantilla de ejemplo al cambiar idioma si el usuario no ha escrito mucho
  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    setCustomFilename(null);
    if (section === 'apuntes') {
      if (apuntesMd === SAMPLE_APUNTES_ES || apuntesMd === SAMPLE_APUNTES_VA) {
        setApuntesMd(newLang === 'va' ? SAMPLE_APUNTES_VA : SAMPLE_APUNTES_ES);
      }
    } else if (section === 'tareas') {
      if (tareasMd === SAMPLE_TAREAS_ES || tareasMd === SAMPLE_TAREAS_VA) {
        setTareasMd(newLang === 'va' ? SAMPLE_TAREAS_VA : SAMPLE_TAREAS_ES);
      }
    }
  };

  // Al cambiar sección, reiniciar customFilename
  const handleSectionChange = (newSection: SectionType) => {
    setSection(newSection);
    setCustomFilename(null);
  };

  // Al cambiar el tipo de examen
  const handleExamenTipoChange = (tipo: ExamenTipo) => {
    setExamenTipo(tipo);
    setCustomFilename(null);
    if (tipo === 'test') {
      setExamQuestionsPerPage('10, 10');
      if (examenesMd === SAMPLE_EXAMEN_MIXTO_ES || examenesMd === SAMPLE_EXAMEN_DESARROLLO_ES) {
        setExamenesMd(SAMPLE_EXAMEN_TEST_ES);
      }
    } else if (tipo === 'mixto') {
      setExamQuestionsPerPage('10');
      if (examenesMd === SAMPLE_EXAMEN_TEST_ES || examenesMd === SAMPLE_EXAMEN_DESARROLLO_ES) {
        setExamenesMd(SAMPLE_EXAMEN_MIXTO_ES);
      }
    } else if (tipo === 'desarrollo') {
      if (examenesMd === SAMPLE_EXAMEN_TEST_ES || examenesMd === SAMPLE_EXAMEN_MIXTO_ES) {
        setExamenesMd(SAMPLE_EXAMEN_DESARROLLO_ES);
      }
    }
  };

  return (
    <div className="app-container">
      <Header
        currentSection={section}
        onSectionChange={handleSectionChange}
        lang={lang}
        onLangChange={handleLangChange}
        isCompiling={compilationState.isCompiling}
      />

      <main className="app-main-split">
        <EditorPane
          section={section}
          lang={lang}
          markdown={currentMarkdown}
          onMarkdownChange={handleMarkdownChange}
          apuntesMode={apuntesMode}
          onApuntesModeChange={(mode) => {
            setApuntesMode(mode);
            setCustomFilename(null);
          }}
          onCondenseApuntes={handleCondenseApuntes}
          examenTipo={examenTipo}
          onExamenTipoChange={handleExamenTipoChange}
          examenDocType={examenDocType}
          onExamenDocTypeChange={(docType) => {
            setExamenDocType(docType);
            setCustomFilename(null);
          }}
          examQuestionsPerPage={examQuestionsPerPage}
          onExamQuestionsPerPageChange={setExamQuestionsPerPage}
          onLoadSample={handleLoadSample}
          onClear={handleClear}
        />

        <PreviewPane
          compilationState={compilationState}
          filename={effectiveFilename}
          isCustomFilename={customFilename !== null}
          onFilenameChange={(name) => setCustomFilename(name)}
          onResetFilename={() => setCustomFilename(null)}
          lang={lang}
          hasPendingChanges={hasPendingChanges}
          onRecompile={triggerCompilation}
        />
      </main>
    </div>
  );
}

export default App;
