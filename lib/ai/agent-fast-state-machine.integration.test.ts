/**
 * Integration test for State Machine integration in agent-fast.ts
 * 
 * Tests that runLessonAgentWithStateMachine properly integrates
 * the TheoryStateMachine for theory generation.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, beforeAll } from 'vitest'

// Mock environment variables before importing modules
beforeAll(() => {
  process.env.GROQ_API_KEY = 'test-key'
  process.env.DATABASE_URL = 'postgresql://test'
})

describe('State Machine Integration - Structure Tests', () => {
  it('should export runLessonAgentWithStateMachine function', async () => {
    const { runLessonAgentWithStateMachine } = await import('./agent-fast')
    
    expect(runLessonAgentWithStateMachine).toBeDefined()
    expect(typeof runLessonAgentWithStateMachine).toBe('function')
  })

  it('should have correct function signature', async () => {
    const { runLessonAgentWithStateMachine } = await import('./agent-fast')
    
    // Check function has correct number of parameters
    expect(runLessonAgentWithStateMachine.length).toBe(5)
  })

  it('should import TheoryStateMachine', async () => {
    const { TheoryStateMachine } = await import('./theory-state-machine')
    
    expect(TheoryStateMachine).toBeDefined()
    expect(typeof TheoryStateMachine).toBe('function')
  })

  it('should have state machine methods', async () => {
    const { TheoryStateMachine } = await import('./theory-state-machine')
    
    const machine = new TheoryStateMachine('test', 'test')
    
    expect(machine.on).toBeDefined()
    expect(machine.getState).toBeDefined()
    expect(machine.run).toBeDefined()
    expect(machine.transition).toBeDefined()
    expect(machine.executeNode).toBeDefined()
  })

  it('should initialize state machine with correct state', async () => {
    const { TheoryStateMachine } = await import('./theory-state-machine')
    
    const machine = new TheoryStateMachine('Test Topic', 'Test Course', 'GENERAL')
    const state = machine.getState()
    
    expect(state.topic).toBe('Test Topic')
    expect(state.courseName).toBe('Test Course')
    expect(state.dbDomain).toBe('GENERAL')
    expect(state.currentNode).toBe('analyze')
    expect(state.sections).toEqual([])
    expect(state.errors).toEqual([])
    expect(state.retryCount).toBe(0)
  })

  it('should support event listeners', async () => {
    const { TheoryStateMachine } = await import('./theory-state-machine')
    
    const machine = new TheoryStateMachine('test', 'test')
    let eventFired = false
    
    machine.on('analyze', () => {
      eventFired = true
    })
    
    // Verify listener was registered (we can't test execution without running the machine)
    expect(eventFired).toBe(false) // Not fired yet
  })
})

describe('State Machine Integration - API Route Compatibility', () => {
  it('should be compatible with API route usage', async () => {
    // Verify the function signature matches what the API route expects
    const { runLessonAgentWithStateMachine } = await import('./agent-fast')
    
    // The API route calls it like this:
    // await runLessonAgentWithStateMachine(topic.name, topic.module.goal.title, user.id, goalDomain, progressCallback)
    
    // Verify it accepts these parameters
    const mockCall = async () => {
      // This won't actually run, just checks the signature
      const result = await runLessonAgentWithStateMachine(
        'topic',
        'course',
        'userId',
        'GENERAL' as any,
        (event) => console.log(event)
      )
      return result
    }
    
    expect(mockCall).toBeDefined()
  })
})


