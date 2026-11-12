// Compiles the sample diagrams with real LaTeX/TikZ and converts them to SVG
// so verify.html can overlay them on the editor's rendering.
//
//   node scripts/verify.mjs        (needs pdflatex and pdftocairo in PATH)
//
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const outDir = join(root, 'verify-out')
const tmp = join(root, 'node_modules', '.verify-tmp')
mkdirSync(outDir, { recursive: true })
mkdirSync(tmp, { recursive: true })

const bundle = join(tmp, 'bundle.mjs')
await build({
  stdin: {
    contents: `export { SAMPLES, BOX } from './src/verify/samples.ts'; export { exportTikz } from './src/tikz/export.ts'`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundle,
  logLevel: 'error',
})
const { SAMPLES, BOX, exportTikz } = await import(pathToFileURL(bundle).href)

for (const [name, diagram] of Object.entries(SAMPLES)) {
  let tex = exportTikz(diagram, { standalone: true })
  tex = tex.replace('[tikz, border=5pt]', '[tikz, border=0pt]')
  tex = tex.replace(/(\\begin\{tikzpicture\}\[[^\n]*\]\n)/,
    `$1  \\path[use as bounding box] (${BOX.x0},${BOX.y0}) rectangle (${BOX.x1},${BOX.y1});\n`)
  const texFile = join(tmp, `${name}.tex`)
  writeFileSync(texFile, tex)
  writeFileSync(join(outDir, `${name}.tex`), tex)
  execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', `${name}.tex`], { cwd: tmp, stdio: 'pipe' })
  execFileSync('pdftocairo', ['-svg', `${name}.pdf`, join(outDir, `${name}.svg`)], { cwd: tmp, stdio: 'pipe' })
  console.log(`ok  ${name}`)
}
rmSync(bundle)
