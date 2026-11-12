import { useMemo, useState } from 'react'
import { useEditor } from '../store/editor'
import { exportTikz } from '../tikz/export'
import { Icon } from './Icon'
import { saveTex } from './actions'

/** Very small TeX highlighter for the code view. */
function highlight(code: string) {
  const parts: JSX.Element[] = []
  const re = /(%.*$)|(\\[A-Za-z]+)|(\$[^$\n]*\$)|(\([^()\n]*\))/gm
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(code))) {
    if (m.index > last) parts.push(<span key={k++}>{code.slice(last, m.index)}</span>)
    const cls = m[1] ? 'text-gray-400' : m[2] ? 'text-blue-700' : m[3] ? 'text-emerald-700' : 'text-amber-700'
    parts.push(<span key={k++} className={cls}>{m[0]}</span>)
    last = m.index + m[0].length
  }
  parts.push(<span key={k++}>{code.slice(last)}</span>)
  return parts
}

export function CodePanel() {
  const d = useEditor((s) => s.diagram)
  const notify = useEditor((s) => s.notify)
  const [standalone, setStandalone] = useState(false)
  const code = useMemo(() => exportTikz(d, { standalone }), [d, standalone])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      notify('TikZ コードをコピーしました')
    } catch {
      notify('コピーできませんでした（ブラウザの権限を確認してください）')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">TikZ コード</h2>
        <label className="ml-auto flex cursor-pointer items-center gap-1 text-xs text-gray-600" title="\documentclass から始まる完全な文書として出力">
          <input type="checkbox" className="accent-blue-600" checked={standalone} onChange={(e) => setStandalone(e.target.checked)} />
          文書全体
        </label>
        <button type="button" onClick={() => saveTex(standalone)} title=".tex をダウンロード"
          className="rounded-md p-1 text-gray-600 hover:bg-gray-200"><Icon name="download" size={16} /></button>
        <button type="button" onClick={copy}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">
          <Icon name="copy" size={14} /> コピー
        </button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre bg-gray-50 p-3 font-mono text-[11.5px] leading-relaxed text-gray-800">
        {highlight(code)}
      </pre>
    </div>
  )
}
