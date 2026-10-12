import { createTypstCompiler, loadFonts } from '@myriaddreamin/typst.ts';

let compilerPromise: Promise<any> | null = null;
let compilerInstance: any = null;

export async function initTypstCompiler(): Promise<any> {
  if (compilerInstance) return compilerInstance;
  if (!compilerPromise) {
    compilerPromise = (async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`;

        const compiler = createTypstCompiler();
        await compiler.init({
          getModule: () => `${baseUrl}typst_ts_web_compiler_bg.wasm`,
          beforeBuild: [
            loadFonts([`${baseUrl}fonts/NotoSerifCJKsc-Regular.otf`], { assets: ['text', 'cjk'] })
          ]
        });
        compilerInstance = compiler;
        return compiler;
      } catch (err) {
        compilerPromise = null;
        console.error('Error inicializando compilador Typst WASM:', err);
        throw err;
      }
    })();
  }
  return compilerPromise;
}

export async function compileTypstToPdf(sourceCode: string): Promise<Uint8Array> {
  const compiler = await initTypstCompiler();
  const filePath = '/document.typ';
  
  compiler.addSource(filePath, sourceCode);
  
  const response = await compiler.compile({
    mainFilePath: filePath,
    format: 1 // CompileFormatEnum.pdf
  });

  if (response && response.result) {
    return response.result;
  }

  const diagnostics = response?.diagnostics;
  if (diagnostics && diagnostics.length > 0) {
    const errorMessages = diagnostics.map((d: any) => typeof d === 'string' ? d : d.message || JSON.stringify(d)).join('\n');
    throw new Error(`Error en el código Typst:\n${errorMessages}`);
  }

  throw new Error('No se pudo generar el archivo PDF');
}
