import { useEffect } from 'react'
import { isTyping } from '../canvas/Canvas'
import { useEditor } from '../store/editor'
import {
  copySelection, deleteSelection, duplicate, fitView, nudge, paste, saveJson, selectAll, toggleNodeFlag, zoomBy,
} from './actions'

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const st = useEditor.getState()
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()

      if (mod) {
        if (k === 'z' && !e.shiftKey) st.undo()
        else if ((k === 'z' && e.shiftKey) || k === 'y') st.redo()
        else if (k === 'a') selectAll()
        else if (k === 'c') copySelection()
        else if (k === 'v') paste()
        else if (k === 'd') duplicate()
        else if (k === 's') saveJson()
        else if (k === '0') fitView()
        else return
        e.preventDefault()
        return
      }
      if (e.altKey) return

      switch (e.key) {
        case 'Delete':
        case 'Backspace': deleteSelection(); break
        case 'Escape': st.setSelection({ nodes: [], edges: [] }); st.setTool('select'); break
        case 'ArrowLeft': nudge(-1, 0); break
        case 'ArrowRight': nudge(1, 0); break
        case 'ArrowUp': nudge(0, 1); break
        case 'ArrowDown': nudge(0, -1); break
        case '+': case '=': zoomBy(1.25); break
        case '-': zoomBy(1 / 1.25); break
        default:
          switch (k) {
            case 'v': st.setTool('select'); break
            case 's': case 'n': st.setTool('state'); break
            case 't': case 'e': st.setTool('transition'); break
            case 'a': toggleNodeFlag('accepting'); break
            case 'i': toggleNodeFlag('initial'); break
            case 'g': if (e.shiftKey) st.setGrid({ show: !st.grid.show }); else st.setGrid({ snap: !st.grid.snap }); break
            case 'f': fitView(); break
            default: return
          }
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
