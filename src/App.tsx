import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SectionType, Language, ApuntesMode, ExamenTipo, ExamenDocType, CompilationState, FontSizesConfig, ExamenVersion } from './types';
import { Header } from './components/Header';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { generateApuntesTypst } from './generators/apuntesGenerator';
import { generateExamenTypst, generateExamenConSolucionarioTypst } from './generators/examenesGenerator';
import { generateTareasTypst, extractTareasMetadata } from './generators/tareasGenerator';
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
  SAMPLE_EXAMEN_TEST_VA,
  SAMPLE_EXAMEN_MIXTO_ES,
  SAMPLE_EXAMEN_MIXTO_VA,
  SAMPLE_EXAMEN_DESARROLLO_ES,
  SAMPLE_EXAMEN_DESARROLLO_VA,
  SAMPLE_TAREAS_ES,
  SAMPLE_TAREAS_VA,
} from './templates/sampleMarkdown';
import './App.css';

const DEFAULT_FONT_SIZES: Record<SectionType, FontSizesConfig> = {
  apuntes: { titulos: 16.5, apartados: 11.4, contenido: 10.9 },
  examenes: { titulos: 16.0, apartados: 9.0, contenido: 9.0, instrucciones: 8.0 },
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
    { id: 'v1', nombre: 'Versión 1', markdown: SAMPLE_EXAMEN_TEST_ES, esUnica: true }
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
    setCustomFilename(null);
    if (section === 'apuntes') {
      setApuntesMd(newText);
    } else if (section === 'examenes') {
      setExamenVersions(prev => prev.map(v => v.id === activeVersionId ? { ...v, markdown: newText } : v));
    } else {
      setTareasMd(newText);
    }
  };

  // Helper para extraer código escolar del curso (2E, 3E, 4E, 1B...)
  function extractCourseCode(markdown: string, defaultCode = '2E'): string {
    const match = markdown.match(/^(?:[#-]\s*(?:\*\*)?)?(?:CURSO|CURS)(?:\*\*)?:\s*(.*)/im);
    if (!match) return defaultCode;
    const raw = match[1].trim();

    const esoMatch = raw.match(/([1-4])(?:[ºªrntd\.]*|\s*de\s*l['’]|\s*de\s*la)?\s*ESO\b/i) || raw.match(/ESO\s*([1-4])/i);
    if (esoMatch) return `${esoMatch[1]}E`;

    const bachMatch = raw.match(/([1-2])(?:[ºªrntd\.]*|\s*de\s*l['’]|\s*de\s*la)?\s*(?:BACH|BATX|BACHILLERATO|BATXILLERAT)\b/i) || raw.match(/(?:BACH|BATX)\s*([1-2])/i);
    if (bachMatch) return `${bachMatch[1]}B`;

    const priMatch = raw.match(/([1-6])(?:[ºªrntd\.]*|\s*de\s*)?\s*(?:PRI|PRIMARIA|PRIMÀRIA)\b/i);
    if (priMatch) return `${priMatch[1]}P`;

    const shortMatch = raw.match(/^([1-6][EBPebp])$/i);
    if (shortMatch) return shortMatch[1].toUpperCase();

    const numMatch = raw.match(/\d+/);
    if (numMatch) return `${numMatch[0]}E`;

    return defaultCode;
  }

  // Helper para extraer código o siglas del idioma desde el texto:
  // C = Castellano, V = Valenciano, IN = Inglés, CH = Chino
  function extractLanguageCode(markdown: string, fallbackLang: Language = 'es'): string {
    const match = markdown.match(/^(?:#\s*)?(?:IDIOMA|LLENGUA|LENGUA|LANG|LANGUAGE):\s*(.*)/im);
    if (match) {
      const raw = match[1].trim();
      // 1. Chino: CH, Chino, Xinés, Xinès, Chinese, Zh, etc.
      if (/^(?:CH\b|CHIN[OA]S?|XIN[ÈE]S|CHINESE|ZH\b)/i.test(raw)) {
        return 'CH';
      }
      // 2. Inglés: IN, Ingles, Inglés, Anglès, Angles, English, Eng, etc.
      if (/^(?:IN\b|INGL[EÉ]S|ANGL[ÈE]S|ENGLISH|ENG\b)/i.test(raw)) {
        return 'IN';
      }
      // 3. Valenciano: V, Valenciano, Valencià, Valencia, etc.
      if (/^(?:V\b|VALENCI[AÀ](?:N[OA]?)?|VAL\b)/i.test(raw)) {
        return 'V';
      }
      // 4. Castellano: C, Castellano, Castellà, Español, Spanish, etc.
      if (/^(?:C\b|CASTELL[AÀ](?:N[OA]?)?|ESPA[ÑN]OL|SPANISH|CAS\b|ES\b)/i.test(raw)) {
        return 'C';
      }
      // Sigla personalizada directa si el usuario escribe e.g. "FR", "DE", etc.
      const clean = raw.toUpperCase().replace(/[^A-Z]/g, '');
      if (clean.length >= 1 && clean.length <= 4) {
        return clean;
      }
    }

    // Fallback: detectar Valenciano por palabras clave en el texto o selector global
    const isValencianByContent = /#(?:CURS|TÍTOL|TITOL|SUBTÍTOL|SUBTITOL):|INSTRUCCIONS:|SOLUCIONARI\b|UNITAT DID[AÀ]CTICA/i.test(markdown);
    if (fallbackLang === 'va' || isValencianByContent) {
      return 'V';
    }
    return 'C';
  }

  function cleanFilenamePart(str: string): string {
    return str
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractThemeName(markdown: string, sec: SectionType): string {
    if (sec === 'examenes') {
      const subMatch = markdown.match(/^(?:#\s*)?(?:SUBTÍTULO|SUBTITULO|SUBTÍTOL):\s*(.*)/im);
      if (subMatch && subMatch[1].trim()) {
        let t = subMatch[1].trim();
        t = t.replace(/^(?:Tema|UD|UDI|UDII|Unitat|Unidad)\s*\d*[:\.-]?\s*/i, '').trim();
        if (/^justicia social/i.test(t)) return 'Justicia Social';
        if (/^just[íi]cia social/i.test(t)) return 'Justícia Social';
        if (t.includes(' - ')) t = t.split(' - ')[0].trim();
        if (t) return cleanFilenamePart(t);
      }
      const titMatch = markdown.match(/^(?:#\s*)?(?:TÍTULO|TITULO|TÍTOL):\s*(.*)/im);
      if (titMatch && titMatch[1].trim()) {
        let t = titMatch[1].trim();
        if (!/^(?:EXAMEN|EXAM|PRUEBA|PROVA)\b/i.test(t)) {
          t = t.replace(/^(?:Tema|UD|UDI|UDII|Unitat|Unidad)\s*\d*[:\.-]?\s*/i, '').trim();
          return cleanFilenamePart(t);
        }
      }
      return 'Justicia Social';
    }

    if (sec === 'apuntes') {
      const titMatch = markdown.match(/^(?:#\s*)?(?:TÍTULO|TITULO|TÍTOL|UNIDAD DID[AÁ]CTICA|UNITAT DID[AÀ]CTICA):\s*(.*)/im);
      if (titMatch && titMatch[1].trim()) {
        let t = titMatch[1].trim();
        t = t.replace(/^(?:Tema|UD|UDI|UDII|Unitat|Unidad)\s*\d*[:\.-]?\s*/i, '').trim();
        if (t.includes(':')) {
          t = t.replace(/:/g, ' - ');
        }
        return cleanFilenamePart(t);
      }
      return 'La dignidad humana';
    }

    if (sec === 'tareas') {
      const isVa = extractLanguageCode(markdown, lang) === 'V';
      const meta = extractTareasMetadata(markdown, isVa);
      let t = meta.tituloTema;
      if (t.includes(':')) {
        t = t.replace(/:/g, ' - ');
      }
      return cleanFilenamePart(t);
    }

    return 'Documento';
  }

  // Helper para determinar si se deben mostrar indicadores de versión en el documento y nombre de archivo
  const shouldShowVersionIndicators = useCallback((
    v: ExamenVersion | undefined,
    _allVersions: ExamenVersion[]
  ): boolean => {
    if (!v) return false;
    // Si la versión es única (o marcada como otro idioma), NUNCA muestra referencias ni códigos
    if (v.esUnica === true || v.esOtroIdioma === true) return false;

    // Solo muestra referencia si la versión explícitamente no es única
    if (v.esUnica === false) return true;

    // Fallback: si no está definido, no mostrar
    return false;
  }, []);

  // Calcular nombre de archivo canónico oficial dinámicamente según datos del texto
  const canonicalFilename = useMemo((): string => {
    if (section === 'apuntes') {
      const langCode = extractLanguageCode(apuntesMd, lang);
      const cursoCode = extractCourseCode(apuntesMd, '4E');
      const tema = extractThemeName(apuntesMd, 'apuntes');
      const isAbrev = apuntesMode === 'abreviado';
      const suffix = isAbrev ? (langCode === 'V' ? ' Abreviat' : ' Abreviado') : '';
      return `AP - ${cursoCode} - ${langCode} - ${tema}${suffix}.pdf`;
    }

    if (section === 'examenes') {
      const currentExMd = activeExamenVersion?.markdown || '';
      const fallbackExLang = (activeExamenVersion?.esOtroIdioma && lang === 'es') ? 'va' : lang;
      const exLangCode = extractLanguageCode(currentExMd, fallbackExLang);
      const cursoCode = extractCourseCode(currentExMd, '2E');
      const tema = extractThemeName(currentExMd, 'examenes');
      const tipoStr = examenTipo === 'test' ? 'Test' : examenTipo === 'mixto' ? 'Mixto' : 'Desarrollo';
      const isSol = examenDocType === 'solucionario';
      const showVer = shouldShowVersionIndicators(activeExamenVersion, examenVersions);
      const verMatch = activeExamenVersion?.nombre.match(/\d+/);
      const verNum = verMatch ? verMatch[0] : '1';
      const solWord = exLangCode === 'V' ? 'Solucionari' : 'Solucionario';

      if (showVer) {
        if (isSol) {
          const verName = activeExamenVersion?.nombre || `Versión ${verNum}`;
          return `EX - ${cursoCode} - ${exLangCode} - ${tema} - ${tipoStr} - ${verName} (EV-${verNum}) - ${solWord}.pdf`;
        } else {
          return `EX - ${cursoCode} - ${exLangCode} - ${tema} - ${tipoStr} - EV-${verNum}.pdf`;
        }
      } else {
        // Versión única o marcada como versión en otro idioma: absolutamente nada de versiones en el nombre
        if (isSol) {
          return `EX - ${cursoCode} - ${exLangCode} - ${tema} - ${tipoStr} - ${solWord}.pdf`;
        } else {
          return `EX - ${cursoCode} - ${exLangCode} - ${tema} - ${tipoStr}.pdf`;
        }
      }
    }

    // Tareas
    const langCode = extractLanguageCode(tareasMd, lang);
    const cursoCode = extractCourseCode(tareasMd, '2E');
    const tema = extractThemeName(tareasMd, 'tareas');
    return `TA - ${cursoCode} - ${langCode} - ${tema}.pdf`;
  }, [section, lang, apuntesMode, examenTipo, examenDocType, examenVersions, activeExamenVersion, apuntesMd, tareasMd, shouldShowVersionIndicators]);

  // Nombre efectivo: personalizado o canónico
  const effectiveFilename = customFilename !== null ? customFilename : canonicalFilename;

  // Generador de código Typst según estado actual
  const buildTypstSource = useCallback((): string => {
    const currentSizes = fontSizesBySection[section];
    if (section === 'apuntes') {
      const isApVa = extractLanguageCode(apuntesMd, lang) === 'V';
      return generateApuntesTypst(apuntesMd, apuntesMode, isApVa ? 'va' : 'es', currentSizes);
    }
    if (section === 'examenes') {
      const currentExMd = activeExamenVersion ? activeExamenVersion.markdown : '';
      const fallbackExLang = (activeExamenVersion?.esOtroIdioma && lang === 'es') ? 'va' : lang;
      const isExVa = extractLanguageCode(currentExMd, fallbackExLang) === 'V';
      const exLang: Language = isExVa ? 'va' : 'es';
      const verName = activeExamenVersion ? activeExamenVersion.nombre : undefined;
      const showVer = shouldShowVersionIndicators(activeExamenVersion, examenVersions);
      return generateExamenTypst(currentExMd, examenTipo, examenDocType, exLang, examQuestionsPerPage, currentSizes, verName, showVer);
    }
    const isTaVa = extractLanguageCode(tareasMd, lang) === 'V';
    return generateTareasTypst(tareasMd, isTaVa ? 'va' : 'es', currentSizes);
  }, [section, apuntesMd, apuntesMode, activeExamenVersion, examenTipo, examenDocType, tareasMd, lang, examQuestionsPerPage, fontSizesBySection, examenVersions, shouldShowVersionIndicators]);

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

  // Helper para identificar si un texto de examen corresponde a una plantilla de ejemplo
  const isSampleExamen = (md: string) => {
    return (
      md === SAMPLE_EXAMEN_TEST_ES || md === SAMPLE_EXAMEN_TEST_VA ||
      md === SAMPLE_EXAMEN_MIXTO_ES || md === SAMPLE_EXAMEN_MIXTO_VA ||
      md === SAMPLE_EXAMEN_DESARROLLO_ES || md === SAMPLE_EXAMEN_DESARROLLO_VA
    );
  };

  const getSampleExamen = (tipo: ExamenTipo, l: Language) => {
    if (tipo === 'mixto') return l === 'va' ? SAMPLE_EXAMEN_MIXTO_VA : SAMPLE_EXAMEN_MIXTO_ES;
    if (tipo === 'desarrollo') return l === 'va' ? SAMPLE_EXAMEN_DESARROLLO_VA : SAMPLE_EXAMEN_DESARROLLO_ES;
    return l === 'va' ? SAMPLE_EXAMEN_TEST_VA : SAMPLE_EXAMEN_TEST_ES;
  };

  // Cargar ejemplo para la sección activa
  const handleLoadSample = () => {
    const isVa = lang === 'va';
    if (section === 'apuntes') {
      setApuntesMd(isVa ? SAMPLE_APUNTES_VA : SAMPLE_APUNTES_ES);
    } else if (section === 'examenes') {
      const sample = getSampleExamen(examenTipo, lang);
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
      if (examenVersions.length === 1) {
        const v = examenVersions[0];
        if (isSampleExamen(v.markdown)) {
          setExamenVersions([
            { id: 'v1', nombre: newLang === 'va' ? 'Versió 1' : 'Versión 1', markdown: getSampleExamen(examenTipo, newLang) }
          ]);
        } else {
          setExamenVersions([
            { ...v, nombre: newLang === 'va' ? 'Versió 1' : 'Versión 1' }
          ]);
        }
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

  // Cambio inteligente de sección transfiriendo el contenido si el usuario acepta la sugerencia
  const handleSwitchSectionWithContent = (targetSection: SectionType) => {
    if (section === 'apuntes' && targetSection === 'tareas') {
      setTareasMd(apuntesMd);
    } else if (section === 'tareas' && targetSection === 'apuntes') {
      setApuntesMd(tareasMd);
    }
    setSection(targetSection);
    setCustomFilename(null);
  };

  // Al cambiar el tipo de examen
  const handleExamenTipoChange = (tipo: ExamenTipo) => {
    setExamenTipo(tipo);
    setCustomFilename(null);
    const isVa = lang === 'va';
    if (tipo === 'test') {
      setExamQuestionsPerPage('10, 10');
      if (examenVersions.length === 1 && isSampleExamen(examenVersions[0].markdown)) {
        setExamenVersions([{ id: 'v1', nombre: isVa ? 'Versió 1' : 'Versión 1', markdown: getSampleExamen('test', lang) }]);
        setActiveVersionId('v1');
      }
    } else if (tipo === 'mixto') {
      setExamQuestionsPerPage('10');
      if (examenVersions.length === 1 && isSampleExamen(examenVersions[0].markdown)) {
        setExamenVersions([{ id: 'v1', nombre: isVa ? 'Versió 1' : 'Versión 1', markdown: getSampleExamen('mixto', lang) }]);
        setActiveVersionId('v1');
      }
    } else if (tipo === 'desarrollo') {
      if (examenVersions.length === 1 && isSampleExamen(examenVersions[0].markdown)) {
        setExamenVersions([{ id: 'v1', nombre: isVa ? 'Versió 1' : 'Versión 1', markdown: getSampleExamen('desarrollo', lang) }]);
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

  // Alternar si la versión activa es una versión única (sin códigos ni referencias)
  const handleToggleUnica = useCallback(() => {
    if (section !== 'examenes' || !activeVersionId) return;
    setExamenVersions(prev =>
      prev.map(v =>
        v.id === activeVersionId
          ? { ...v, esUnica: !v.esUnica }
          : v
      )
    );
    setCustomFilename(null);
  }, [section, activeVersionId]);

  // Crear una nueva versión única (tantas como el usuario desee, conservando el texto actual)
  const handleAddVersionUnica = useCallback(() => {
    if (section !== 'examenes') return;
    const currentMd = activeExamenVersion ? activeExamenVersion.markdown : '';
    const isCurrentVa = lang === 'va' || /#(?:CURS|TÍTOL|TITOL|SUBTÍTOL|SUBTITOL):|INSTRUCCIONS:|SOLUCIONARI\b/i.test(currentMd);
    const isVa = isCurrentVa;

    const existingUniqueNumbers = examenVersions
      .filter(v => v.esUnica !== false)
      .map(v => {
        const m = v.nombre.match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      });
    const maxUnique = existingUniqueNumbers.length > 0 ? Math.max(...existingUniqueNumbers) : 0;
    const nextUniqueNum = maxUnique + 1;
    const defaultNombre = isVa ? `Única ${nextUniqueNum}` : `Única ${nextUniqueNum}`;

    const newVersion: ExamenVersion = {
      id: `u-${Date.now()}`,
      nombre: defaultNombre,
      markdown: currentMd || (isVa ? SAMPLE_EXAMEN_TEST_VA : SAMPLE_EXAMEN_TEST_ES),
      esUnica: true,
    };

    setExamenVersions(prev => [...prev, newVersion]);
    setActiveVersionId(newVersion.id);
    setCustomFilename(null);
  }, [section, activeExamenVersion, examenVersions, lang]);

  // Crear una nueva versión referenciada (barajada, con referencias EV-X empezando en 2, 3, 4...)
  const handleAddVersionReferenciada = useCallback(() => {
    if (section !== 'examenes') return;
    const isVa = lang === 'va';
    const existingRefNumbers = examenVersions
      .filter(v => v.esUnica === false)
      .map(v => {
        const m = v.nombre.match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      });
    const maxRef = existingRefNumbers.length > 0 ? Math.max(...existingRefNumbers) : 1;
    const nextRefNum = maxRef + 1;
    const baseMd = activeExamenVersion ? activeExamenVersion.markdown : SAMPLE_EXAMEN_TEST_ES;
    const newMd = generarNuevaVersionExamen(baseMd, isVa);

    const newVersion: ExamenVersion = {
      id: `ref-${Date.now()}`,
      nombre: isVa ? `Versió ${nextRefNum}` : `Versión ${nextRefNum}`,
      markdown: newMd,
      esUnica: false,
    };

    setExamenVersions(prev => [...prev, newVersion]);
    setActiveVersionId(newVersion.id);
    setCustomFilename(null);
  }, [section, activeExamenVersion, examenVersions, lang]);

  // Recompilar automáticamente al cambiar el estado de versión única
  const prevUnicaRef = useRef<boolean | undefined>(activeExamenVersion?.esUnica);
  useEffect(() => {
    if (prevUnicaRef.current !== activeExamenVersion?.esUnica) {
      prevUnicaRef.current = activeExamenVersion?.esUnica;
      triggerCompilation();
    }
  }, [activeExamenVersion?.esUnica, triggerCompilation]);

  // Ajustes interactivos de tamaño de fuente
  const handleFontSizeNudge = (key: keyof FontSizesConfig, delta: number) => {
    setFontSizesBySection((prev) => {
      const current = prev[section];
      const defaultVal = DEFAULT_FONT_SIZES[section][key] ?? (key === 'instrucciones' ? 8.0 : 9.0);
      const baseVal = current[key] ?? defaultVal;
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
      const showVer = shouldShowVersionIndicators(activeExamenVersion, examenVersions);

      const fallbackExLang = (activeExamenVersion?.esOtroIdioma && lang === 'es') ? 'va' : lang;
      const exLangCode = extractLanguageCode(currentExMd, fallbackExLang);
      const isVersionVa = exLangCode === 'V';
      const exLang: Language = isVersionVa ? 'va' : 'es';

      const solTypst = generateExamenTypst(
        currentExMd,
        examenTipo,
        'solucionario',
        exLang,
        examQuestionsPerPage,
        currentSizes,
        verName,
        showVer
      );
      const solPdfBytes = await compileTypstToPdf(solTypst);
      const solBlob = new Blob([solPdfBytes as any], { type: 'application/pdf' });
      const solBlobUrl = URL.createObjectURL(solBlob);

      const cursoCode = extractCourseCode(currentExMd, '2E');
      const tema = extractThemeName(currentExMd, 'examenes');
      const tipoStr = examenTipo === 'test' ? 'Test' : examenTipo === 'mixto' ? 'Mixto' : 'Desarrollo';
      const verMatch = verName?.match(/\d+/);
      const verNum = verMatch ? verMatch[0] : '1';
      const solWord = isVersionVa ? 'Solucionari' : 'Solucionario';

      let solName = '';
      if (showVer && verName) {
        solName = `EX - ${cursoCode} - ${exLangCode} - ${tema} - ${tipoStr} - ${verName} (EV-${verNum}) - ${solWord}.pdf`;
      } else {
        solName = `EX - ${cursoCode} - ${exLangCode} - ${tema} - ${tipoStr} - ${solWord}.pdf`;
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
  }, [activeExamenVersion, examenTipo, lang, examQuestionsPerPage, fontSizesBySection, examenVersions, shouldShowVersionIndicators]);

  // Imprimir documento (En exámenes imprime examen + solucionario con la versión visible si corresponde)
  const handlePrint = useCallback(async () => {
    try {
      let pdfUrlToPrint = compilationState.pdfBlobUrl;
      let tempBlobUrl: string | null = null;

      if (section === 'examenes') {
        const currentSizes = fontSizesBySection.examenes;
        const currentExMd = activeExamenVersion ? activeExamenVersion.markdown : '';
        const verName = activeExamenVersion ? activeExamenVersion.nombre : undefined;
        const showVer = shouldShowVersionIndicators(activeExamenVersion, examenVersions);

        const isVersionVa = (activeExamenVersion?.esOtroIdioma && lang === 'es') ||
          /#(?:CURS|TÍTOL|TITOL|SUBTÍTOL|SUBTITOL):|INSTRUCCIONS:|SOLUCIONARI\b/i.test(currentExMd) ||
          (lang === 'va' && !activeExamenVersion?.esOtroIdioma);
        const exLang: Language = isVersionVa ? 'va' : 'es';

        // Generar documento oficial combinado: examen + solucionario
        const combinedTypst = generateExamenConSolucionarioTypst(
          currentExMd,
          examenTipo,
          exLang,
          examQuestionsPerPage,
          currentSizes,
          verName,
          showVer
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
  }, [compilationState.pdfBlobUrl, section, activeExamenVersion, examenTipo, lang, examQuestionsPerPage, fontSizesBySection, examenVersions, shouldShowVersionIndicators]);

  // Descarga consecutiva de todas las versiones con sus respectivos solucionarios
  const handleDownloadAllVersions = useCallback(async () => {
    const currentSizes = fontSizesBySection.examenes;
    const tipoStr = examenTipo === 'test' ? 'Test' : examenTipo === 'mixto' ? 'Mixto' : 'Desarrollo';

    for (let idx = 0; idx < examenVersions.length; idx++) {
      const v = examenVersions[idx];
      const showVer = shouldShowVersionIndicators(v, examenVersions);
      const vLangCode = extractLanguageCode(v.markdown, lang);
      const isVersionVa = vLangCode === 'V';
      const vLang: Language = isVersionVa ? 'va' : 'es';
      const vSolWord = isVersionVa ? 'Solucionari' : 'Solucionario';
      const cursoCode = extractCourseCode(v.markdown, '2E');
      const tema = extractThemeName(v.markdown, 'examenes');
      const verMatch = v.nombre.match(/\d+/);
      const verNum = verMatch ? verMatch[0] : `${idx + 1}`;

      try {
        // 1. Descargar Examen de la versión
        const exTypst = generateExamenTypst(
          v.markdown,
          examenTipo,
          'examen',
          vLang,
          examQuestionsPerPage,
          currentSizes,
          v.nombre,
          showVer
        );
        const exPdfBytes = await compileTypstToPdf(exTypst);
        const exBlob = new Blob([exPdfBytes as any], { type: 'application/pdf' });
        const exUrl = URL.createObjectURL(exBlob);

        const exLink = document.createElement('a');
        exLink.href = exUrl;
        exLink.download = showVer
          ? `EX - ${cursoCode} - ${vLangCode} - ${tema} - ${tipoStr} - EV-${verNum}.pdf`
          : `EX - ${cursoCode} - ${vLangCode} - ${tema} - ${tipoStr}.pdf`;
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
          vLang,
          examQuestionsPerPage,
          currentSizes,
          v.nombre,
          showVer
        );
        const solPdfBytes = await compileTypstToPdf(solTypst);
        const solBlob = new Blob([solPdfBytes as any], { type: 'application/pdf' });
        const solUrl = URL.createObjectURL(solBlob);

        const solLink = document.createElement('a');
        solLink.href = solUrl;
        solLink.download = showVer
          ? `EX - ${cursoCode} - ${vLangCode} - ${tema} - ${tipoStr} - ${v.nombre} (EV-${verNum}) - ${vSolWord}.pdf`
          : `EX - ${cursoCode} - ${vLangCode} - ${tema} - ${tipoStr} - ${vSolWord}.pdf`;
        document.body.appendChild(solLink);
        solLink.click();
        document.body.removeChild(solLink);
        setTimeout(() => URL.revokeObjectURL(solUrl), 5000);

        await new Promise(res => setTimeout(res, 350));
      } catch (e) {
        console.error(`Error downloading version ${v.nombre}:`, e);
      }
    }
  }, [examenVersions, fontSizesBySection, lang, examenTipo, examQuestionsPerPage, shouldShowVersionIndicators]);

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
          onAddVersionUnica={handleAddVersionUnica}
          onAddVersionReferenciada={handleAddVersionReferenciada}
          onToggleUnica={handleToggleUnica}
          onDeleteVersion={handleDeleteVersion}
          onShufflePreguntas={handleShufflePreguntas}
          onShuffleRespuestas={handleShuffleRespuestas}
          fontSizes={fontSizesBySection[section]}
          onFontSizeNudge={handleFontSizeNudge}
          onFontSizeSet={handleFontSizeSet}
          onResetFontSizes={handleResetFontSizes}
          onLoadSample={handleLoadSample}
          onClear={handleClear}
          onSwitchSection={handleSwitchSectionWithContent}
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
