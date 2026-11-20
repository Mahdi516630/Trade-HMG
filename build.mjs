import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify as minifyHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';
import JavaScriptObfuscator from 'javascript-obfuscator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');

const HTML_PAGES = [
  'index.html',
  'logistique.html',
  'sourcing.html',
  'conseil.html',
  'a-propos.html',
  'contact.html',
  'mentions-legales.html',
  'merci.html',
];

const JS_FILES = [
  { name: 'theme.js', heavyObfuscation: false },
  { name: 'guard.js', heavyObfuscation: true },
  { name: 'ui.js', heavyObfuscation: true },
  { name: 'forms.js', heavyObfuscation: true },
  { name: 'gallery.js', heavyObfuscation: true },
  { name: 'i18n.js', heavyObfuscation: false },
];

export async function buildDist() {
  await fs.mkdir(path.join(DIST_DIR, 'css'), { recursive: true });
  await fs.mkdir(path.join(DIST_DIR, 'js'), { recursive: true });

  const cssInput = await fs.readFile(path.join(__dirname, 'css', 'main.css'), 'utf8');
  const cssResult = new CleanCSS({ level: 2, sourceMap: false }).minify(cssInput);
  if (cssResult.errors.length) {
    throw new Error(`CSS minification failed: ${cssResult.errors.join('; ')}`);
  }
  await fs.writeFile(path.join(DIST_DIR, 'css', 'main.css'), cssResult.styles, 'utf8');

  for (const entry of JS_FILES) {
    const srcPath = path.join(__dirname, 'js', entry.name);
    const raw = await fs.readFile(srcPath, 'utf8');
    const terserOut = await minifyJs(raw, {
      compress: { drop_console: true, passes: 2 },
      mangle: { toplevel: false },
      format: { comments: false },
    });
    const baseCode = terserOut.code || raw;
    const obfuscated = JavaScriptObfuscator.obfuscate(baseCode, {
      compact: true,
      controlFlowFlattening: entry.heavyObfuscation,
      controlFlowFlatteningThreshold: entry.heavyObfuscation ? 0.65 : 0,
      deadCodeInjection: false,
      disableConsoleOutput: true,
      identifierNamesGenerator: 'hexadecimal',
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      splitStrings: entry.heavyObfuscation,
      splitStringsChunkLength: 8,
      stringArray: true,
      stringArrayEncoding: [entry.heavyObfuscation ? 'rc4' : 'base64'],
      stringArrayThreshold: entry.heavyObfuscation ? 0.85 : 0.75,
      transformObjectKeys: entry.heavyObfuscation,
      unicodeEscapeSequence: true,
      sourceMap: false,
    }).getObfuscatedCode();

    await fs.writeFile(path.join(DIST_DIR, 'js', entry.name), obfuscated, 'utf8');
  }

  for (const page of HTML_PAGES) {
    const htmlInput = await fs.readFile(path.join(__dirname, page), 'utf8');
    const htmlMin = await minifyHtml(htmlInput, {
      collapseWhitespace: true,
      conservativeCollapse: false,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
      processScripts: ['application/ld+json'],
    });
    await fs.writeFile(path.join(DIST_DIR, page), htmlMin, 'utf8');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await buildDist();
  console.log('Production bundle built cleanly in dist/');
}
