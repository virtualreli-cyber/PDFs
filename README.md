# Portal Editorial • Generador de PDFs (Religión Católica)

Aplicación web profesional y determinista para la redacción, previsualización en vivo y generación oficial de documentos escolares en PDF (Apuntes, Exámenes y Dossiers de Tareas) conforme al Sistema de Diseño Pastel del Departamento de Religión Católica.

---

## 🚀 Características Principales

- **Arquitectura 100% Client-Side (JAMstack / WebAssembly):**
  - Utiliza el motor oficial de **Typst compilado en WebAssembly (WASM)** en el propio navegador.
  - No requiere servidor backend ni APIs externas de pago.
  - Cero costes de hosting y privacidad total (los textos nunca salen de tu dispositivo).
- **Diseño Editorial Pastel Canónico:**
  - Aplica exactamente la geometría, tipografía (Georgia 10.9pt / Helvetica Neue), interlineados y paleta pastel oficial.
- **Bilingüe (Castellano / Valencià AVL):**
  - Selector de idioma en cabecera con adaptación automática de nomenclaturas y textos normativos.
- **Apartados:**
  1. **Apuntes (`AP`):**
     - Versión Extendida y Versión Abreviada (con reducción $\ge 30\%$ y herramienta de condensación automática).
     - Catálogo didáctico de cajas pastel (Cita Bíblica / Magisterio, Ejemplo del Día a Día, Glosario, Dato Histórico, Arte y Símbolo, Testimonio, ¿Sabías que...?, Para Pensar).
     - Paginación dinámica según volumen real de contenido.
  2. **Exámenes (`EX`):**
     - Soporte para las 3 modalidades canónicas: **Tipo Test** (20 preguntas a 2 columnas), **Mixto** (10 test + 3 de desarrollo) y **Desarrollo Completo** (4 bloques).
     - Paginación estricta de 2 páginas exactas (1 hoja por ambas caras).
     - Generador integrado de **Solucionario Oficial** en un PDF independiente de 1 página.
  3. **Tareas y Actividades (`TA`):**
     - Modularidad estricta (1 actividad/sesión = 1 página auto-contenida).
     - Sin numeración de página para permitir impresión suelta o en dossier.
     - Pautas punteadas realistas (16pt de interlineado para escritura a mano).
     - Página final de Rúbrica de Autoevaluación (4 niveles de desempeño: 1 a 4 puntos) y reflexión personal sobre 12 puntos.

---

## 🛠️ Instalación y Uso en Local

### Requisitos
- Node.js 18+ y npm

### Instrucciones
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción
npm run build

# 4. Probar build de producción en local
npm run preview
```

---

## ☁️ Despliegue en Netlify desde GitHub

1. Sube este proyecto a tu nuevo repositorio de GitHub.
2. Inicia sesión en [Netlify](https://app.netlify.com/) y pulsa **Add new site** > **Import an existing project** > **GitHub**.
3. Selecciona tu repositorio.
4. Netlify detectará automáticamente el archivo `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Haz clic en **Deploy site**. ¡Listo!
