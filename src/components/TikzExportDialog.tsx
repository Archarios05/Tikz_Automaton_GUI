import React, { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { Button } from './ui/button'
import { useEditorStore } from '../store/editorStore'

interface TikzExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

const TikzExportDialog: React.FC<TikzExportDialogProps> = ({ isOpen, onClose }) => {
  const { exportToTikz, showToast } = useEditorStore()
  const [copied, setCopied] = useState(false)
  
  if (!isOpen) return null
  
  const tikzCode = exportToTikz()
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tikzCode)
      setCopied(true)
      showToast('TikZコードがクリップボードにコピーされました', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      showToast('コピーに失敗しました', 'error')
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">TikZコードエクスポート</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2">生成されたTikZコードは以下の通りです：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>TikZ automataライブラリに準拠</li>
              <li>双方向エッジは自動的にbend left/rightで分離</li>
              <li>ループエッジはloop above/below/left/rightで表現</li>
              <li>数式モード（$...$）でラベルを表示</li>
            </ul>
          </div>
          
          <div className="relative">
            <textarea
              value={tikzCode}
              readOnly
              className="w-full h-64 p-3 text-sm font-mono border rounded-md bg-gray-50"
              style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
            />
            <Button
              onClick={handleCopy}
              size="sm"
              className="absolute top-2 right-2"
              variant={copied ? "default" : "secondary"}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  コピー済み
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  コピー
                </>
              )}
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>使用方法：</strong><br />
            このコードをLaTeXドキュメントに貼り付けて使用してください。<br />
            必要なパッケージ: <code>{'\\usepackage{tikz}'}</code>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <Button onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            クリップボードにコピー
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TikzExportDialog
