import { useEffect } from 'react'

const KEYS: [string, string][] = [
  ['V / S / T', '選択 / 状態追加 / 遷移追加 ツール'],
  ['ダブルクリック', '空白: 状態を追加、状態・遷移: ラベル編集'],
  ['ドラッグ (遷移)', '曲げ角度を変更（ループは向きを変更）'],
  ['Alt + ドラッグ', 'グリッドスナップを一時的に反転'],
  ['G / Shift+G', 'スナップ ON/OFF / グリッド表示 ON/OFF'],
  ['A / I', '選択中の状態を受理 / 初期状態に切り替え'],
  ['矢印キー', '選択中の状態を 1 グリッド（スナップOFF時 0.1cm）移動'],
  ['Delete', '削除'],
  ['Ctrl+Z / Ctrl+Shift+Z', '元に戻す / やり直す'],
  ['Ctrl+C / V / D', 'コピー / 貼り付け / 複製'],
  ['Ctrl+A', 'すべて選択'],
  ['Ctrl+S', 'JSON で保存'],
  ['ホイール / Ctrl+ホイール', 'スクロール / ズーム'],
  ['Space+ドラッグ, 中ボタン', '画面の移動'],
  ['F', '全体を表示'],
]

export function HelpDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="操作方法"
        className="max-h-full w-full max-w-lg overflow-auto rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-base font-semibold">操作方法</h2>
        <p className="mb-4 text-sm text-gray-600">
          キャンバスの描画は出力される TikZ コードを LaTeX でコンパイルした結果と同じ見た目になるよう計算しています
          （状態の大きさ・矢印・ラベル位置・曲線・ループ）。ラベルは TeX の数式モードで入力します（例: <code>q_0</code>, <code>\varepsilon</code>）。
        </p>
        <table className="w-full text-sm">
          <tbody>
            {KEYS.map(([k, v]) => (
              <tr key={k} className="border-t border-gray-100">
                <td className="whitespace-nowrap py-1.5 pr-4 font-mono text-xs text-gray-800">{k}</td>
                <td className="py-1.5 text-gray-600">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-gray-500">
          出力コードに必要なもの: <code>\usepackage{'{'}tikz{'}'}</code> と <code>\usetikzlibrary{'{'}automata, arrows.meta{'}'}</code>
        </p>
        <div className="mt-4 text-right">
          <button type="button" onClick={onClose} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">閉じる</button>
        </div>
      </div>
    </div>
  )
}
