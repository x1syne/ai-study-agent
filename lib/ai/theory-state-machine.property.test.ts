/**
 * Property-Based Tests for Theory State Machine
 * 
 * Tests universal properties of the state machine:
 * - Property 8: State Machine Structure
 * - Property 9: State Machine Error Handling
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { TheoryStateMachine, StateNode } from './theory-state-machine'

describe('Theory State Machine - Property Tests', () => {
  // Feature: mcp-integration, Property 8: State Machine Structure
  // **Validates: Requirements 7.1, 7.4, 7.5**
  it('Property 8: State machine follows correct sequence and emits events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }), // topic
        fc.string({ minLength: 3, maxLength: 50 }), // courseName
        async (topic, courseName) => {
          const machine = new TheoryStateMachine(topic, courseName)
          
          // Track state transitions
          const stateSequence: StateNode[] = []
          const eventsFired: StateNode[] = []
          
          // Subscribe to all state events
          const states: StateNode[] = ['analyze', 'generate', 'validate', 'retry', 'complete', 'failed']
          states.forEach(state => {
            machine.on(state, (s) => {
              eventsFired.push(state)
              stateSequence.push(s.currentNode)
            })
          })
          
          // Get initial state
          const initialState = machine.getState()
          
          // Property 1: Initial state should be 'analyze'
          expect(initialState.currentNode).toBe('analyze')
          expect(initialState.topic).toBe(topic)
          expect(initialState.courseName).toBe(courseName)
          expect(initialState.analysis).toBeNull()
          expect(initialState.sections).toHaveLength(0)
          expect(initialState.errors).toHaveLength(0)
          expect(initialState.retryCount).toBe(0)
          
          // Run the state machine
          try {
            await machine.run()
            
            const finalState = machine.getState()
            
            // Property 2: Final state should be 'complete' or 'failed'
            expect(['complete', 'failed']).toContain(finalState.currentNode)
            
            // Property 3: State sequence should follow valid transitions
            // analyze → generate → validate → complete
            if (finalState.currentNode === 'complete') {
              expect(stateSequence).toContain('analyze')
              expect(stateSequence).toContain('generate')
              expect(stateSequence).toContain('validate')
              expect(stateSequence).toContain('complete')
              
              // Property 4: Events should be emitted for each state
              expect(eventsFired.length).toBeGreaterThan(0)
              expect(eventsFired).toContain('analyze')
              expect(eventsFired).toContain('generate')
              expect(eventsFired).toContain('validate')
              expect(eventsFired).toContain('complete')
            }
            
            // Property 5: State should be inspectable at any time
            expect(finalState.topic).toBe(topic)
            expect(finalState.courseName).toBe(courseName)
            
            // Property 6: Analysis should be populated after analyze state
            if (stateSequence.includes('generate')) {
              expect(finalState.analysis).not.toBeNull()
            }
            
            // Property 7: Sections should be populated after generate state
            if (stateSequence.includes('validate')) {
              expect(finalState.sections.length).toBeGreaterThan(0)
            }
          } catch (error) {
            // If it fails, it should be in 'failed' state
            const finalState = machine.getState()
            expect(finalState.currentNode).toBe('failed')
            expect(finalState.errors.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: mcp-integration, Property 9: State Machine Error Handling
  // **Validates: Requirements 7.2, 7.3**
  it('Property 9: State machine handles errors with retry and feedback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }), // topic
        fc.string({ minLength: 3, maxLength: 50 }), // courseName
        fc.integer({ min: 0, max: 5 }), // number of failures to inject
        async (topic, courseName, failureCount) => {
          // Create a custom state machine that can inject failures
          class TestableStateMachine extends TheoryStateMachine {
            private injectedFailures = 0
            private maxInjectedFailures: number

            constructor(topic: string, courseName: string, maxFailures: number) {
              super(topic, courseName)
              this.maxInjectedFailures = maxFailures
            }

            // Override executeGenerate to inject failures
            async executeNode(node: StateNode): Promise<void> {
              if (node === 'generate' && this.injectedFailures < this.maxInjectedFailures) {
                this.injectedFailures++
                const state = this.getState()
                state.errors.push(`Injected failure ${this.injectedFailures}`)
                state.retryCount++
                
                // Transition to retry on failure (Requirements 7.2)
                await this.transition('retry')
                return
              }
              
              // Call parent implementation
              await super.executeNode(node)
            }
          }

          const machine = new TestableStateMachine(topic, courseName, failureCount)
          
          // Track retry transitions
          const retryTransitions: number[] = []
          machine.on('retry', (state) => {
            retryTransitions.push(state.retryCount)
          })
          
          // Track validation failures that go back to generate
          const validationToGenerateTransitions: number[] = []
          let lastNode: StateNode = 'analyze'
          machine.on('generate', (state) => {
            if (lastNode === 'validate') {
              validationToGenerateTransitions.push(state.retryCount)
            }
            lastNode = 'generate'
          })
          machine.on('validate', () => { lastNode = 'validate' })
          machine.on('analyze', () => { lastNode = 'analyze' })
          machine.on('retry', () => { lastNode = 'retry' })
          
          try {
            await machine.run()
            
            const finalState = machine.getState()
            
            // Property 1: If failures occurred, retry should have been triggered
            if (failureCount > 0) {
              expect(retryTransitions.length).toBeGreaterThan(0)
            }
            
            // Property 2: Retry count should not exceed max retries (3)
            expect(finalState.retryCount).toBeLessThanOrEqual(3)
            
            // Property 3: If max retries exceeded, should be in 'failed' state
            if (finalState.retryCount >= 3 && failureCount > 3) {
              expect(finalState.currentNode).toBe('failed')
              expect(finalState.errors.length).toBeGreaterThan(0)
            }
            
            // Property 4: Errors should be tracked
            if (failureCount > 0) {
              expect(finalState.errors.length).toBeGreaterThan(0)
            }
          } catch (error) {
            // If it throws, it should be because of max retries
            const finalState = machine.getState()
            
            // Property 5: On failure, state should be 'failed'
            expect(finalState.currentNode).toBe('failed')
            
            // Property 6: Errors should be recorded
            expect(finalState.errors.length).toBeGreaterThan(0)
            
            // Property 7: Should have attempted retries
            if (failureCount > 0) {
              expect(retryTransitions.length).toBeGreaterThan(0)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
