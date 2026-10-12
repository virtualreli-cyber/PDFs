import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SectionType, Language, ApuntesMode, ExamenTipo, ExamenDocType, CompilationState, FontSizesConfig, ExamenVersion } from './types';
import { Header } from './components/Header';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { generateApuntesTypst } from './generators/apuntesGenerator';
import { generateExamenTypst, generateExamenConSolucionarioTypst } from './generators/examenesGenerator';
import { generateTareasTypst } from './generators/tareasGenerator';
import { compileTypstToPdf } from './services/typstCompiler';
import {
  aleatorizarPreguntas,
  aleatorizarRespuestas,
  generarNuevaVersionExamen,
} from './utils/examenRandomizer';
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

const DEFAULT_FONT_SIZES: Record<SectionType, FontSizesConfig> = {
  apuntes: { titulos: 16.5, apartados: 11.4, contenido: 10.9 },
  examenes: { titulos: 18.0, apartados: 10.8, contenido: 10.5, instrucciones: 9.5 },
  tareas: { titulos: 12.5, apartados: 10.5, contenido: 10.8 },
};

export function App() {
  const [section, setSection] = useState<SectionType>('apuntes');
  const [lang, setLang] = useState<Language>('es');

  // Estados específicos de Apuntes
  const [apuntesMode, setApuntesMode] = useState<ApuntesMode>('extendido');
  const [apuntesMd, setApuntesMd] = useState<string>(SAMPLE_APUNTES_ES);

  // Estados específicos de Exámenes y Versiones
  const [examenTipo, setExamenTipo] = useState<ExamenTipo>('test');
  const [examenDocType, setExamenDocType] = useState<ExamenDocType>('examen');
  const [examQuestionsPerPage, setExamQuestionsPerPage] = useState<string>('10, 10');
  const [examenVersions, setExamenVersions] = useState<ExamenVersion[]>([
    { id: 'v1', nombre: 'Versión 1', markdown: SAMPLE_EXAMEN_TEST_ES }
  ]);
  const [activeVersionId, setActiveVersionId] = useState<string>('v1');

  // Obtener la versión de examen activa
  const activeExamenVersion = useMemo(() => {
    return examenVersions.find(v => v.id === activeVersionId) || examenVersions[0];
  }, [examenVersions, activeVersionId]);

  // Estados específicos de Tareas
  const [tareasMd, setTareasMd] = useState<string>(SAMPLE_TAREAS_ES);

  // Configuración de tamaño de fuente por sección
  const [fontSizesBySection, setFontSizesBySection] = useState<Record<SectionType, FontSizesConfig>>(DEFAULT_FONT_SIZES);

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
  const currentMarkdown = section === 'apuntes'
    ? apuntesMd
    : section === 'examenes'
    ? (activeExamenVersion?.markdown || '')
    : tareasMd;

  // Manejar cambio de texto en el editor (NO recompila automáticamente)
  const handleMarkdownChange = (newText: string) => {
    if (section === 'apuntes') {
      setApuntesMd(newText);
    } else if (section === 'examenes') {
      setExamenVersions(prev => prev.map(v => v.id === activeVersionId ? { ...v, markdown: newText } : v));
    } else {
      setTareasMd(newText);
    }
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
      const isSol = examenDocType === 'solucionario';
      const verMatch = activeExamenVersion?.nombre.match(/\d+/);
      const verNum = verMatch ? verMatch[0] : '1';

      if (isSol) {
        const verStr = activeExamenVersion ? ` - ${activeExamenVersion.nombre} (EV-${verNum})` : '';
        const solStr = isVa ? ' - Solucionari' : ' - Solucionario';
        return `EX - 2E - ${langCode} - Justicia Social - ${tipoStr}${verStr}${solStr}.pdf`;
      } else {
        // En el examen del alumno nunca debe decir "Versión X", usamos la referencia cifrada EV-X
        const verStr = examenVersions.length > 1 ? ` - EV-${verNum}` : '';
        return `EX - 2E - ${langCode} - Justicia Social - ${tipoStr}${verStr}.pdf`;
      }
    }

    // Tareas
    return `TA - 2E - ${langCode} - Historia de la Iglesia Primitiva - Dossier de tareas.pdf`;
  }, [section, lang, apuntesMode, examenTipo, examenDocType, examenVersions, activeExamenVersion]);

  // Nombre efectivo: personalizado o canónico
  const effectiveFilename = customFilename !== null ? customFilename : canonicalFilename;

  // Generador de código Typst según estado actual
  const buildTypstSource = useCallback((): string => {
    const currentSizes = fontSizesBySection[section];
    if (section === 'apuntes') {
      return generateApuntesTypst(apuntesMd, apuntesMode, lang, currentSizes);
    }
    if (section === 'examenes') {
      const currentExMd = activeExamenVersion ? activeExamenVersion.markdown : '';
      const verName = activeExamenVersion ? activeExamenVersion.nombre : undefined;
      return generateExamenTypst(currentExMd, examenTipo, examenDocType, lang, examQuestionsPerPage, currentSizes, verName);
    }
    return generateTareasTypst(tareasMd, lang, currentSizes);
  }, [section, apuntesMd, apuntesMode, activeExamenVersion, examenTipo, examenDocType, tareasMd, lang, examQuestionsPerPage, fontSizesBySection]);

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
      let sample = SAMPLE_EXAMEN_TEST_ES;
      if (examenTipo === 'mixto') sample = SAMPLE_EXAMEN_MIXTO_ES;
      else if (examenTipo === 'desarrollo') sample = SAMPLE_EXAMEN_DESARROLLO_ES;
      setExamenVersions([
        { id: 'v1', nombre: isVa ? 'Versió 1' : 'Versión 1', markdown: sample }
      ]);
      setActiveVersionId('v1');
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
    } else if (section === 'examenes') {
      if (examenVersions.length === 1 && (examenVersions[0].nombre === 'Versión 1' || examenVersions[0].nombre === 'Versió 1')) {
        setExamenVersions([
          { ...examenVersions[0], nombre: newLang === 'va' ? 'Versió 1' : 'Versión 1' }
        ]);
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
    const isVa = lang === 'va';
    if (tipo === 'test') {
      setExamQuestionsPerPage('10, 10');
      if (examenVersions.length === 1 && (examenVersions[0].markdown === SAMPLE_EXAMEN_MIXTO_ES || examenVersions[0].markdown === SAMPLE_EXAMEN_DESARROLLO_ES)) {
        setExamenVersions([{ id: 'v1', nombre: isVa ? 'Versió 1' : 'Versión 1', markdown: SAMPLE_EXAMEN_TEST_ES }]);
        setActiveVersionId('v1');
      }
    } else if (tipo === 'mixto') {
      setExamQuestionsPerPage('10');
      if (examenVersions.length === 1 && (examenVersions[0].markdown === SAMPLE_EXAMEN_TEST_ES || examenVersions[0].markdown === SAMPLE_EXAMEN_DESARROLLO_ES)) {
        setExamenVersions([{ id: 'v1', nombre: isVa ? 'Versió 1' : 'Versión 1', markdown: SAMPLE_EXAMEN_MIXTO_ES }]);
        setActiveVersionId('v1');
      }
    } else if (tipo === 'desarrollo') {
      if (examenVersions.length === 1 && (examenVersions[0].markdown === SAMPLE_EXAMEN_TEST_ES || examenVersions[0].markdown === SAMPLE_EXAMEN_MIXTO_ES)) {
        setExamenVersions([{ id: 'v1', nombre: isVa ? 'Versió 1' : 'Versión 1', markdown: SAMPLE_EXAMEN_DESARROLLO_ES }]);
        setActiveVersionId('v1');
      }
    }
  };

  // =========================================================================
  // GESTIÓN Y BARATAMIENTO DE VERSIONES DE EXAMEN
  // =========================================================================

  // Barajar preguntas de la versión activa
  const handleShufflePreguntas = () => {
    if (section !== 'examenes' || !activeExamenVersion) return;
    const isVa = lang === 'va';
    const updated = aleatorizarPreguntas(activeExamenVersion.markdown, isVa);
    setExamenVersions(prev => prev.map(v => v.id === activeVersionId ? { ...v, markdown: updated } : v));
  };

  // Barajar respuestas de la versión activa
  const handleShuffleRespuestas = () => {
    if (section !== 'examenes' || !activeExamenVersion) return;
    const isVa = lang === 'va';
    const updated = aleatorizarRespuestas(activeExamenVersion.markdown, isVa);
    setExamenVersions(prev => prev.map(v => v.id === activeVersionId ? { ...v, markdown: updated } : v));
  };

  // Crear una nueva versión garantizando permutación aleatoria distinta
  const handleAddVersion = () => {
    if (section !== 'examenes') return;
    const isVa = lang === 'va';
    const nextNum = examenVersions.length + 1;
    const baseMd = activeExamenVersion ? activeExamenVersion.markdown : SAMPLE_EXAMEN_TEST_ES;
    const newMd = generarNuevaVersionExamen(baseMd, isVa);
    const newVersion: ExamenVersion = {
      id: `v${Date.now()}`,
      nombre: isVa ? `Versió ${nextNum}` : `Versión ${nextNum}`,
      markdown: newMd,
    };
    setExamenVersions(prev => [...prev, newVersion]);
    setActiveVersionId(newVersion.id);
    setCustomFilename(null);
  };

  // Eliminar una versión de examen
  const handleDeleteVersion = (id: string) => {
    if (examenVersions.length <= 1) return;
    const remaining = examenVersions.filter(v => v.id !== id);
    setExamenVersions(remaining);
    if (activeVersionId === id) {
      setActiveVersionId(remaining[0].id);
    }
  };

  // Seleccionar una versión de examen
  const handleSelectVersion = (id: string) => {
    setActiveVersionId(id);
    setCustomFilename(null);
  };

  // Ajustes interactivos de tamaño de fuente
  const handleFontSizeNudge = (key: keyof FontSizesConfig, delta: number) => {
    setFontSizesBySection((prev) => {
      const current = prev[section];
      const baseVal = current[key] ?? (key === 'instrucciones' ? 9.5 : 10.5);
      const newVal = Math.round((baseVal + delta) * 10) / 10;
      const clamped = Math.max(6, Math.min(36, newVal));
      return {
        ...prev,
        [section]: {
          ...current,
          [key]: clamped,
        },
      };
    });
  };

  const handleFontSizeSet = (key: keyof FontSizesConfig, value: number) => {
    setFontSizesBySection((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: Math.max(6, Math.min(36, value)),
      },
    }));
  };

  const handleResetFontSizes = () => {
    setFontSizesBySection((prev) => ({
      ...prev,
      [section]: { ...DEFAULT_FONT_SIZES[section] },
    }));
  };

  // Descarga de soluciones de la versión activa
  const handleDownloadSoluciones = useCallback(async () => {
    try {
      const currentSizes = fontSizesBySection.examenes;
      const currentExMd = activeExamenVersion ? activeExamenVersion.markdown : '';
      const verName = activeExamenVersion ? activeExamenVersion.nombre : undefined;
      const solTypst = generateExamenTypst(
        currentExMd,
        examenTipo,
        'solucionario',
        lang,
        examQuestionsPerPage,
        currentSizes,
        verName
      );
      const solPdfBytes = await compileTypstToPdf(solTypst);
      const solBlob = new Blob([solPdfBytes as any], { type: 'application/pdf' });
      const solBlobUrl = URL.createObjectURL(solBlob);

      let solName = effectiveFilename.replace(/\.pdf$/i, '');
      const isVa = lang === 'va';
      const verMatch = verName?.match(/\d+/);
      const verNum = verMatch ? verMatch[0] : '1';
      if (verName) {
        solName = solName.replace(new RegExp(`\\s*-\\s*EV-${verNum}`, 'i'), '');
        solName = `${solName} - ${verName} (EV-${verNum})`;
      }
      if (!solName.toLowerCase().includes('solucionari')) {
        solName += isVa ? ' - Solucionari.pdf' : ' - Solucionario.pdf';
      } else {
        solName += '.pdf';
      }

      const link = document.createElement('a');
      link.href = solBlobUrl;
      link.download = solName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(solBlobUrl), 5000);
    } catch (err) {
      console.error('Error generating soluciones PDF:', err);
    }
  }, [activeExamenVersion, examenTipo, lang, examQuestionsPerPage, fontSizesBySection, effectiveFilename]);

  // Imprimir documento (En exámenes imprime examen + solucionario con la versión visible)
  const handlePrint = useCallback(async () => {
    try {
      let pdfUrlToPrint = compilationState.pdfBlobUrl;
      let tempBlobUrl: string | null = null;

      if (section === 'examenes') {
        const currentSizes = fontSizesBySection.examenes;
        const currentExMd = activeExamenVersion ? activeExamenVersion.markdown : '';
        const verName = activeExamenVersion ? activeExamenVersion.nombre : undefined;
        // Generar documento oficial combinado: examen + solucionario con la versión visible
        const combinedTypst = generateExamenConSolucionarioTypst(
          currentExMd,
          examenTipo,
          lang,
          examQuestionsPerPage,
          currentSizes,
          verName
        );
        const combinedBytes = await compileTypstToPdf(combinedTypst);
        const blob = new Blob([combinedBytes as any], { type: 'application/pdf' });
        tempBlobUrl = URL.createObjectURL(blob);
        pdfUrlToPrint = tempBlobUrl;
      }

      if (!pdfUrlToPrint) return;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.src = pdfUrlToPrint;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Error invoking print dialog on iframe:', e);
            window.open(pdfUrlToPrint!, '_blank');
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            if (tempBlobUrl) URL.revokeObjectURL(tempBlobUrl);
          }, 60000);
        }, 500);
      };
    } catch (err) {
      console.error('Error al imprimir documento:', err);
    }
  }, [compilationState.pdfBlobUrl, section, activeExamenVersion, examenTipo, lang, examQuestionsPerPage, fontSizesBySection]);

  // Descarga consecutiva de todas las versiones con sus respectivos solucionarios
  const handleDownloadAllVersions = useCallback(async () => {
    const currentSizes = fontSizesBySection.examenes;
    const isVa = lang === 'va';
    const langCode = isVa ? 'V' : 'C';
    const tipoStr = examenTipo === 'test' ? 'Test' : examenTipo === 'mixto' ? 'Mixto' : 'Desarrollo';

    for (let idx = 0; idx < examenVersions.length; idx++) {
      const v = examenVersions[idx];
      try {
        // 1. Descargar Examen de la versión
        const exTypst = generateExamenTypst(
          v.markdown,
          examenTipo,
          'examen',
          lang,
          examQuestionsPerPage,
          currentSizes,
          v.nombre
        );
        const exPdfBytes = await compileTypstToPdf(exTypst);
        const exBlob = new Blob([exPdfBytes as any], { type: 'application/pdf' });
        const exUrl = URL.createObjectURL(exBlob);

        const verMatch = v.nombre.match(/\d+/);
        const verNum = verMatch ? verMatch[0] : `${idx + 1}`;

        const exLink = document.createElement('a');
        exLink.href = exUrl;
        exLink.download = `EX - 2E - ${langCode} - Justicia Social - ${tipoStr} - EV-${verNum}.pdf`;
        document.body.appendChild(exLink);
        exLink.click();
        document.body.removeChild(exLink);
        setTimeout(() => URL.revokeObjectURL(exUrl), 5000);

        await new Promise(res => setTimeout(res, 350));

        // 2. Descargar Solucionario de la versión
        const solTypst = generateExamenTypst(
          v.markdown,
          examenTipo,
          'solucionario',
          lang,
          examQuestionsPerPage,
          currentSizes,
          v.nombre
        );
        const solPdfBytes = await compileTypstToPdf(solTypst);
        const solBlob = new Blob([solPdfBytes as any], { type: 'application/pdf' });
        const solUrl = URL.createObjectURL(solBlob);

        const solLink = document.createElement('a');
        solLink.href = solUrl;
        solLink.download = `EX - 2E - ${langCode} - Justicia Social - ${tipoStr} - ${v.nombre} (EV-${verNum}) - ${isVa ? 'Solucionari' : 'Solucionario'}.pdf`;
        document.body.appendChild(solLink);
        solLink.click();
        document.body.removeChild(solLink);
        setTimeout(() => URL.revokeObjectURL(solUrl), 5000);

        await new Promise(res => setTimeout(res, 350));
      } catch (e) {
        console.error(`Error downloading version ${v.nombre}:`, e);
      }
    }
  }, [examenVersions, fontSizesBySection, lang, examenTipo, examQuestionsPerPage]);

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
          examenVersions={examenVersions}
          activeVersionId={activeVersionId}
          onSelectVersion={handleSelectVersion}
          onAddVersion={handleAddVersion}
          onDeleteVersion={handleDeleteVersion}
          onShufflePreguntas={handleShufflePreguntas}
          onShuffleRespuestas={handleShuffleRespuestas}
          fontSizes={fontSizesBySection[section]}
          onFontSizeNudge={handleFontSizeNudge}
          onFontSizeSet={handleFontSizeSet}
          onResetFontSizes={handleResetFontSizes}
          onLoadSample={handleLoadSample}
          onClear={handleClear}
        />

        <PreviewPane
          section={section}
          examenDocType={examenDocType}
          compilationState={compilationState}
          filename={effectiveFilename}
          isCustomFilename={customFilename !== null}
          onFilenameChange={(name) => setCustomFilename(name)}
          onResetFilename={() => setCustomFilename(null)}
          lang={lang}
          hasPendingChanges={hasPendingChanges}
          onRecompile={triggerCompilation}
          onDownloadSoluciones={handleDownloadSoluciones}
          onPrint={handlePrint}
          hasMultipleVersions={examenVersions.length > 1}
          onDownloadAllVersions={handleDownloadAllVersions}
        />
      </main>
    </div>
  );
}

export default App;
