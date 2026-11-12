/**
 * TeX label rendering with KaTeX (Computer Modern fonts, TeX metrics).
 *
 * Labels are rendered at font-size 10px, so one CSS px inside the label
 * equals one TeX point — the same unit the canvas uses.
 */
import katex from 'katex'

export interface TexBox {
  /** TeX box dimensions in pt. */
  width: number
  height: number
  depth: number
  /** Rendered HTML (font-size 10px). */
  html: string
  /** Distance from the top of the rendered HTML box to the baseline, in pt. */
  baselineOffset: number
  error: boolean
}

export const EMPTY_BOX: TexBox = { width: 0, height: 0, depth: 0, html: '', baselineOffset: 0, error: false }

const MEASURE_SCALE = 10
const cache = new Map<string, TexBox>()
let host: HTMLDivElement | null = null

function getHost(): HTMLDivElement {
  if (!host) {
    host = document.createElement('div')
    host.setAttribute('aria-hidden', 'true')
    // measured at 10× size (MEASURE_SCALE) to avoid whole-pixel rounding
    host.style.cssText = `position:absolute;left:-10000px;top:-10000px;visibility:hidden;pointer-events:none;--tex-fs:${10 * MEASURE_SCALE}px`
    document.body.appendChild(host)
  }
  return host
}

function renderHtml(tex: string, mode: 'math' | 'text'): { html: string; error: boolean } {
  const src = mode === 'text' ? `\\text{${tex}}` : tex
  try {
    return { html: katex.renderToString(src, { throwOnError: true, output: 'html', strict: 'ignore' }), error: false }
  } catch {
    // Unparseable TeX: show the source in red so the problem is visible.
    return { html: `<span class="tex-error">${escapeHtml(tex)}</span>`, error: true }
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

/** Wrapper markup shared by measurement and rendering. */
export function wrapHtml(inner: string): string {
  return `<span class="tex-label">${inner}</span>`
}

export function measureTex(tex: string, mode: 'math' | 'text'): TexBox {
  if (tex.trim() === '') return EMPTY_BOX
  const key = `${mode}\u0000${tex}`
  const hit = cache.get(key)
  if (hit) return hit

  const rendered = renderHtml(tex, mode)
  const error = rendered.error
  const el = getHost()
  el.innerHTML = `${wrapHtml(rendered.html)}<span style="display:inline-block;width:0;height:0;vertical-align:baseline"></span>`
  const wrap = el.firstElementChild as HTMLElement
  const marker = el.lastElementChild as HTMLElement
  if (!error) emulateOpticalSizes(wrap)
  const html = wrap.innerHTML
  const wr = wrap.getBoundingClientRect()
  const baselineOffset = (marker.getBoundingClientRect().top - wr.top) / MEASURE_SCALE

  // KaTeX struts carry the exact TeX height+depth of each line part.
  let height = 0
  let depth = 0
  wrap.querySelectorAll<HTMLElement>('.katex-html > .base > .strut').forEach((s) => {
    const h = parseFloat(s.style.height) || 0
    const va = parseFloat(s.style.verticalAlign) || 0
    const dp = -va
    height = Math.max(height, h - dp)
    depth = Math.max(depth, dp)
  })
  if (error) {
    height = baselineOffset / 10
    depth = Math.max(0, wr.height / MEASURE_SCALE - baselineOffset) / 10
  }
  const box: TexBox = {
    width: wr.width / MEASURE_SCALE,
    height: height * 10,
    depth: depth * 10,
    html,
    baselineOffset,
    error,
  }
  el.innerHTML = ''
  cache.set(key, box)
  return box
}

/**
 * TeX typesets sub/superscripts with the optically sized fonts cmr7/cmmi7
 * (and cmr5/cmmi5), which are noticeably wider than cmr10 scaled down —
 * KaTeX only scales. Measured against TeX, the width ratios are very stable,
 * so script-size glyph runs are stretched horizontally by these factors.
 */
const OPTICAL: Record<string, { italic: number; upright: number }> = {
  size3: { italic: 1.16, upright: 1.14 }, // scriptstyle   (0.7)
  size1: { italic: 1.44, upright: 1.36 }, // scriptscript  (0.5)
}

function emulateOpticalSizes(root: HTMLElement) {
  const leaves: { el: HTMLElement; k: number }[] = []
  root.querySelectorAll<HTMLElement>('.katex-html span').forEach((span) => {
    const hasText = Array.from(span.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '')
    if (!hasText) return
    let size: string | undefined
    for (let p: HTMLElement | null = span; p && p !== root; p = p.parentElement) {
      size = Array.from(p.classList).find((c) => /^size\d+$/.test(c))
      if (size) break
    }
    const f = size && OPTICAL[size]
    if (!f) return
    const italic = span.classList.contains('mathnormal') || span.classList.contains('mathit')
    leaves.push({ el: span, k: italic ? f.italic : f.upright })
  })
  // measure first, then write (avoids layout thrashing)
  const widths = leaves.map(({ el }) => el.getBoundingClientRect().width / parseFloat(getComputedStyle(el).fontSize))
  leaves.forEach(({ el, k }, i) => {
    const inner = document.createElement('span')
    inner.style.cssText = `display:inline-block;transform:scaleX(${k});transform-origin:0 0`
    while (el.firstChild) inner.appendChild(el.firstChild)
    el.appendChild(inner)
    el.style.display = 'inline-block'
    // em-based (relative to the glyph run's own font size) so it scales with --tex-fs
    el.style.width = `${(widths[i] * k).toFixed(5)}em`
  })
}

/* Font loading: metrics are only correct once the KaTeX fonts are loaded. */

type Listener = () => void
const listeners = new Set<Listener>()
let version = 0

export function subscribeFonts(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
export function fontVersion() { return version }

function invalidate() {
  cache.clear()
  version++
  listeners.forEach((l) => l())
}

export function initFonts() {
  if (typeof document === 'undefined' || !document.fonts) return
  const faces = [
    '10px KaTeX_Main', 'italic 10px KaTeX_Math', 'italic 10px KaTeX_Main',
    'bold 10px KaTeX_Main', '10px KaTeX_AMS', '10px KaTeX_Size1',
  ]
  Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)))
    .then(() => document.fonts.ready)
    .then(invalidate)
  // A label may use a face that was not preloaded (e.g. \mathcal).
  document.fonts.addEventListener?.('loadingdone', invalidate)
}
