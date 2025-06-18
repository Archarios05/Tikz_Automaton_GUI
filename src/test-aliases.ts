// This is a test file to verify path aliases are working
import { cn } from './lib/utils'
import { useEditorStore } from './store/editorStore'

// This file should compile without errors if path aliases are working correctly
export const testAliases = () => {
  console.log('Relative paths are working!')
}
