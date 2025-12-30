/**
 * 🐍 PYODIDE UTILITIES - Browser Python Execution
 * 
 * Выполнение Python кода в браузере через WebAssembly
 * Используется для авто-проверки code задач
 * 
 * Особенности:
 * - Lazy loading (загружается только при необходимости)
 * - Timeout protection (5 секунд по умолчанию)
 * - Sandbox execution (безопасно)
 */

import type { PyodideInterface } from 'pyodide'

// ═══════════════════════════════════════════════════════════════
// 🔧 TYPES
// ═══════════════════════════════════════════════════════════════

export type PyodideInstance = PyodideInterface

export interface CodeExecutionResult {
  success: boolean
  output: string
  error?: string
  executionTime: number
  testsRun?: number
  testsPassed?: number
}

export interface TestCase {
  input: string
  expectedOutput: string
  description?: string
}

// ═══════════════════════════════════════════════════════════════
// 🚀 PYODIDE LOADER
// ═══════════════════════════════════════════════════════════════

let pyodideInstance: PyodideInstance | null = null
let loadingPromise: Promise<PyodideInstance> | null = null

/**
 * Load Pyodide instance (lazy, singleton)
 */
export async function loadPyodide(): Promise<PyodideInstance> {
  if (pyodideInstance) {
    return pyodideInstance
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async (): Promise<PyodideInstance> => {
    console.log('[Pyodide] Loading...')
    const startTime = Date.now()

    // Dynamic import for browser-only
    const pyodideModule = await import('pyodide')
    
    const instance = await pyodideModule.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
    })

    pyodideInstance = instance
    console.log(`[Pyodide] Loaded in ${Date.now() - startTime}ms`)
    return instance
  })()

  return loadingPromise
}

/**
 * Check if Pyodide is loaded
 */
export function isPyodideLoaded(): boolean {
  return pyodideInstance !== null
}

// ═══════════════════════════════════════════════════════════════
// 🎯 CODE EXECUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Execute Python code with timeout
 */
export async function executePython(
  code: string,
  timeout: number = 5000
): Promise<CodeExecutionResult> {
  const startTime = Date.now()

  try {
    const pyodide = await loadPyodide()

    // Create execution promise with timeout
    const executionPromise = pyodide.runPythonAsync(`
import sys
from io import StringIO

# Capture stdout
_stdout = sys.stdout
sys.stdout = StringIO()

try:
    exec('''${code.replace(/'/g, "\\'")}''')
    _output = sys.stdout.getvalue()
except Exception as e:
    _output = f"Error: {type(e).__name__}: {e}"
finally:
    sys.stdout = _stdout

_output
`)

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), timeout)
    })

    const output = await Promise.race([executionPromise, timeoutPromise])

    return {
      success: true,
      output: String(output),
      executionTime: Date.now() - startTime
    }
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Unknown error',
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * Execute code with test cases
 */
export async function executeWithTests(
  userCode: string,
  testCases: TestCase[],
  timeout: number = 10000
): Promise<CodeExecutionResult> {
  const startTime = Date.now()

  // Build test code
  const testCode = buildTestCode(userCode, testCases)

  try {
    const pyodide = await loadPyodide()

    const executionPromise = pyodide.runPythonAsync(testCode)

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), timeout)
    })

    const result = await Promise.race([executionPromise, timeoutPromise])
    const output = String(result)

    // Parse test results
    const passedMatch = output.match(/PASSED: (\d+)/)
    const failedMatch = output.match(/FAILED: (\d+)/)
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0

    return {
      success: failed === 0,
      output,
      executionTime: Date.now() - startTime,
      testsRun: passed + failed,
      testsPassed: passed
    }
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Unknown error',
      executionTime: Date.now() - startTime,
      testsRun: testCases.length,
      testsPassed: 0
    }
  }
}

/**
 * Build test execution code
 */
function buildTestCode(userCode: string, testCases: TestCase[]): string {
  const escapedCode = userCode.replace(/'/g, "\\'").replace(/\n/g, '\\n')
  
  const testCasesJson = JSON.stringify(testCases.map(tc => ({
    input: tc.input,
    expected: tc.expectedOutput,
    desc: tc.description || ''
  })))

  return `
import sys
from io import StringIO
import json

# User code
exec('''${escapedCode}''')

# Test cases
test_cases = json.loads('${testCasesJson.replace(/'/g, "\\'")}')

passed = 0
failed = 0
results = []

for i, tc in enumerate(test_cases):
    try:
        # Capture output
        old_stdout = sys.stdout
        sys.stdout = StringIO()
        
        # Execute test
        result = eval(tc['input'])
        output = sys.stdout.getvalue().strip()
        sys.stdout = old_stdout
        
        # Compare
        expected = tc['expected']
        actual = str(result) if result is not None else output
        
        if actual.strip() == expected.strip():
            passed += 1
            results.append(f"✅ Test {i+1}: {tc['desc'] or 'OK'}")
        else:
            failed += 1
            results.append(f"❌ Test {i+1}: Expected {expected}, got {actual}")
    except Exception as e:
        failed += 1
        results.append(f"❌ Test {i+1}: Error - {e}")
        sys.stdout = old_stdout

# Summary
summary = f"""
{'\\n'.join(results)}

{'='*40}
PASSED: {passed}
FAILED: {failed}
{'='*40}
{'✅ All tests passed!' if failed == 0 else '❌ Some tests failed'}
"""

summary
`
}

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Validate Python syntax without execution
 */
export async function validatePythonSyntax(code: string): Promise<{
  valid: boolean
  error?: string
  line?: number
}> {
  try {
    const pyodide = await loadPyodide()

    await pyodide.runPythonAsync(`
import ast
ast.parse('''${code.replace(/'/g, "\\'")}''')
`)

    return { valid: true }
  } catch (error: any) {
    const lineMatch = error.message?.match(/line (\d+)/)
    return {
      valid: false,
      error: error.message,
      line: lineMatch ? parseInt(lineMatch[1]) : undefined
    }
  }
}

/**
 * Load additional Python packages
 */
export async function loadPythonPackages(packages: string[]): Promise<void> {
  const pyodide = await loadPyodide()
  await pyodide.loadPackage(packages)
}

/**
 * Reset Pyodide globals (for clean execution)
 */
export async function resetPyodideGlobals(): Promise<void> {
  if (!pyodideInstance) return

  await pyodideInstance.runPythonAsync(`
# Clear user-defined variables
import sys
_keep = set(dir()) | {'_keep'}
for _name in list(dir()):
    if _name not in _keep and not _name.startswith('_'):
        del globals()[_name]
`)
}
