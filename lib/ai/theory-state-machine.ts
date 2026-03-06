/**
 * Theory State Machine
 * 
 * State graph architecture for theory generation with:
 * - State transitions: analyze → generate → validate → complete
 * - Error handling with retry logic
 * - Event emission for progress tracking
 * - State inspection capabilities
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { TopicAnalysis } from './agent-fast'
import { Domain } from '@prisma/client'

// State node types
export type StateNode = 'analyze' | 'generate' | 'validate' | 'retry' | 'complete' | 'failed'

// Section result from generation
export interface SectionResult {
  title: string
  content: string
  provider?: string
  error?: string
}

// Theory state
export interface TheoryState {
  topic: string
  courseName: string
  currentNode: StateNode
  previousNode?: StateNode  // Track where we came from for retry logic
  analysis: TopicAnalysis | null
  sections: SectionResult[]
  errors: string[]
  retryCount: number
  dbDomain?: Domain
}

// State transition definition
export interface StateTransition {
  from: StateNode
  to: StateNode
  condition?: (state: TheoryState) => boolean
}

// Event listener type
export type StateEventListener = (state: TheoryState) => void | Promise<void>

/**
 * TheoryStateMachine - State graph for theory generation
 * 
 * Implements a state machine with the following flow:
 * analyze → generate → validate → complete
 * 
 * On errors:
 * - Node failure → retry (up to 3 times)
 * - Validation failure → generate (with feedback)
 * - Max retries → failed
 */
export class TheoryStateMachine {
  private state: TheoryState
  private transitions: StateTransition[]
  private listeners: Map<StateNode, StateEventListener[]>
  private maxRetries: number = 3

  constructor(topic: string, courseName: string, dbDomain?: Domain) {
    // Initialize state
    this.state = {
      topic,
      courseName,
      currentNode: 'analyze',
      analysis: null,
      sections: [],
      errors: [],
      retryCount: 0,
      dbDomain
    }

    // Define valid transitions
    this.transitions = [
      { from: 'analyze', to: 'generate' },
      { from: 'analyze', to: 'retry' },
      { from: 'generate', to: 'validate' },
      { from: 'generate', to: 'retry' },
      { from: 'validate', to: 'complete', condition: (s) => this.isValidationSuccessful(s) },
      { from: 'validate', to: 'generate', condition: (s) => !this.isValidationSuccessful(s) },
      { from: 'validate', to: 'retry' },
      { from: 'retry', to: 'analyze' },
      { from: 'retry', to: 'generate' },
      { from: 'retry', to: 'validate' },
      { from: 'retry', to: 'failed' }
    ]

    // Initialize event listeners
    this.listeners = new Map()
  }

  /**
   * Transition to a new state
   * Requirements: 7.1, 7.5 - state transitions and event emission
   */
  async transition(to: StateNode): Promise<void> {
    const from = this.state.currentNode

    // Find valid transition
    const validTransition = this.transitions.find(t => {
      if (t.from !== from || t.to !== to) return false
      if (t.condition) return t.condition(this.state)
      return true
    })

    if (!validTransition) {
      throw new Error(`Invalid transition from ${from} to ${to}`)
    }

    console.log(`[StateMachine] ${from} → ${to}`)
    
    // Store previous node when transitioning TO retry (for retry logic)
    if (to === 'retry') {
      this.state.previousNode = from
    }
    
    // Update state
    this.state.currentNode = to

    // Emit event
    await this.emitEvent(to)
  }

  /**
   * Execute a state node
   * Requirements: 7.1, 7.2, 7.3 - node execution with error handling
   */
  async executeNode(node: StateNode): Promise<void> {
    console.log(`[StateMachine] Executing node: ${node}`)

    try {
      switch (node) {
        case 'analyze':
          await this.executeAnalyze()
          break
        case 'generate':
          await this.executeGenerate()
          break
        case 'validate':
          await this.executeValidate()
          break
        case 'retry':
          await this.executeRetry()
          break
        case 'complete':
          await this.executeComplete()
          break
        case 'failed':
          await this.executeFailed()
          break
      }
    } catch (error) {
      console.error(`[StateMachine] Node ${node} failed:`, error)
      this.state.errors.push(`${node}: ${error instanceof Error ? error.message : String(error)}`)
      
      // Transition to retry on failure
      // Requirements: 7.2 - transition to retry node on failure
      if (node !== 'retry' && node !== 'failed') {
        this.state.retryCount++
        await this.transition('retry')
      }
    }
  }

  /**
   * Subscribe to state events
   * Requirements: 7.5 - event emission system
   */
  on(node: StateNode, callback: StateEventListener): void {
    if (!this.listeners.has(node)) {
      this.listeners.set(node, [])
    }
    this.listeners.get(node)!.push(callback)
  }

  /**
   * Get current state
   * Requirements: 7.4 - state inspection
   */
  getState(): TheoryState {
    return { ...this.state }
  }

  /**
   * Run the state machine
   * Requirements: 7.1 - complete state machine flow
   */
  async run(): Promise<string> {
    console.log(`[StateMachine] Starting theory generation for "${this.state.topic}"`)

    // Execute state machine flow
    while (this.state.currentNode !== 'complete' && this.state.currentNode !== 'failed') {
      await this.executeNode(this.state.currentNode)
    }

    // Return result
    if (this.state.currentNode === 'complete') {
      return this.formatTheoryContent()
    } else {
      throw new Error(`Theory generation failed: ${this.state.errors.join(', ')}`)
    }
  }

  // Private helper methods

  private async executeAnalyze(): Promise<void> {
    console.log('[StateMachine] Analyzing topic...')
    
    // Import analyzeTopicFast dynamically to avoid circular dependency
    const { analyzeTopicFast } = await import('./agent-fast')
    
    // Perform actual analysis
    this.state.analysis = await analyzeTopicFast(
      this.state.topic,
      this.state.courseName,
      this.state.dbDomain
    )

    console.log(`[StateMachine] Analysis complete: domain=${this.state.analysis.domain}`)

    // Transition to generate
    await this.transition('generate')
  }

  private async executeGenerate(): Promise<void> {
    console.log('[StateMachine] Generating sections...')

    if (!this.state.analysis) {
      throw new Error('Cannot generate without analysis')
    }

    // Import generation functions dynamically to avoid circular dependency
    const { generateAllSectionsParallelForStateMachine } = await import('./agent-fast')
    const { getFullRAGContext, getDomainRAGContext } = await import('@/lib/rag')
    const { DOMAIN_TO_TYPE } = await import('./domain-prompts')
    
    // Get RAG context
    const domainType = this.state.analysis.domainEnum ? DOMAIN_TO_TYPE[this.state.analysis.domainEnum] : undefined
    const ragContext = await (domainType 
      ? getDomainRAGContext(this.state.topic, this.state.courseName, domainType)
      : getFullRAGContext(this.state.topic, this.state.courseName)
    ).catch(e => {
      console.warn('[StateMachine] RAG context failed:', e)
      return ''
    })

    // Generate sections using the actual implementation
    const result = await generateAllSectionsParallelForStateMachine(
      this.state.analysis,
      ragContext
    )

    // Store sections with metadata
    this.state.sections = result.sections.map((content, index) => ({
      title: `Section ${index + 1}`,
      content,
      provider: result.providers[0] || 'unknown'
    }))

    console.log(`[StateMachine] Generated ${this.state.sections.length} sections`)

    // Transition to validate
    await this.transition('validate')
  }

  private async executeValidate(): Promise<void> {
    console.log('[StateMachine] Validating content...')

    const hasContent = this.state.sections.length > 0 &&
                      this.state.sections.some(s => s.content.length > 100)

    if (!hasContent) {
      console.warn('[StateMachine] Validation failed: insufficient content')
      this.state.errors.push('Validation failed: insufficient content')

      // Используем единый retry-механизм (validate → retry → generate),
      // чтобы избежать прямого цикла validate → generate → validate
      this.state.retryCount++
      await this.transition('retry')
      return
    }

    console.log('[StateMachine] Validation successful')
    await this.transition('complete')
  }

  private async executeRetry(): Promise<void> {
    console.log(`[StateMachine] Retry ${this.state.retryCount}/${this.maxRetries}`)

    // Check if we've exceeded max retries
    if (this.state.retryCount >= this.maxRetries) {
      console.error('[StateMachine] Max retries exceeded')
      await this.transition('failed')
      return
    }

    // Determine which node to retry based on where we came from
    const retryNode = this.state.previousNode || 'analyze'
    
    console.log(`[StateMachine] Retrying from ${retryNode}`)
    await this.transition(retryNode)
  }

  private async executeComplete(): Promise<void> {
    console.log('[StateMachine] Theory generation complete')
    // No transition needed - this is terminal state
  }

  private async executeFailed(): Promise<void> {
    console.error('[StateMachine] Theory generation failed')
    console.error('[StateMachine] Errors:', this.state.errors)
    // No transition needed - this is terminal state
  }

  private isValidationSuccessful(state: TheoryState): boolean {
    return state.sections.length > 0 && 
           state.sections.some(s => s.content.length > 100)
  }

  private formatTheoryContent(): string {
    return this.state.sections
      .map(s => s.content)
      .join('\n\n---\n\n')
  }

  private async emitEvent(node: StateNode): Promise<void> {
    const listeners = this.listeners.get(node) || []
    for (const listener of listeners) {
      await listener(this.state)
    }
  }
}

// Export helper function to create and run state machine
export async function generateTheoryWithStateMachine(
  topic: string,
  courseName: string,
  dbDomain?: Domain
): Promise<{ content: string; state: TheoryState }> {
  const machine = new TheoryStateMachine(topic, courseName, dbDomain)
  
  // Add logging listeners
  machine.on('analyze', (state) => {
    console.log(`[StateMachine Event] analyze - domain: ${state.analysis?.domain}`)
  })
  machine.on('generate', (state) => {
    console.log(`[StateMachine Event] generate - sections: ${state.sections.length}`)
  })
  machine.on('validate', (state) => {
    console.log(`[StateMachine Event] validate - errors: ${state.errors.length}`)
  })
  machine.on('complete', (state) => {
    console.log(`[StateMachine Event] complete - total sections: ${state.sections.length}`)
  })
  machine.on('failed', (state) => {
    console.error(`[StateMachine Event] failed - errors: ${state.errors.join(', ')}`)
  })

  const content = await machine.run()
  const state = machine.getState()

  return { content, state }
}
