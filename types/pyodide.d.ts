/**
 * Type declarations for Pyodide
 */

declare module 'pyodide' {
  export interface PyodideInterface {
    runPythonAsync(code: string): Promise<any>
    loadPackage(packages: string[]): Promise<void>
    globals: any
  }

  export interface LoadPyodideOptions {
    indexURL?: string
    fullStdLib?: boolean
    stdin?: () => string
    stdout?: (text: string) => void
    stderr?: (text: string) => void
  }

  export function loadPyodide(options?: LoadPyodideOptions): Promise<PyodideInterface>
}

declare module 'remark-gfm' {
  import { Plugin } from 'unified'
  const remarkGfm: Plugin
  export default remarkGfm
}

declare module 'remark-math' {
  import { Plugin } from 'unified'
  const remarkMath: Plugin
  export default remarkMath
}

declare module 'rehype-katex' {
  import { Plugin } from 'unified'
  const rehypeKatex: Plugin
  export default rehypeKatex
}
