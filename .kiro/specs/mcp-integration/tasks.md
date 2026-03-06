# Implementation Plan: MCP Integration

## Overview

Поэтапная реализация интеграции Model Context Protocol в AI Study Agent. План разбит на 3 фазы с инкрементальной доставкой функциональности. Каждая фаза заканчивается checkpoint для проверки работоспособности.

## Tasks

### Phase 1: Core Infrastructure

- [x] 1. Setup MCP SDK and dependencies
  - Install @modelcontextprotocol/sdk package
  - Install fast-check for property-based testing
  - Update package.json with new dependencies
  - _Requirements: All_

- [x] 2. Implement MCP Client base
  - [x] 2.1 Create MCPClient class with server management
    - Implement constructor with config loading
    - Implement initialize() method for server startup
    - Implement callTool() method for tool invocation
    - Implement listTools() and getServerStatus() methods
    - _Requirements: 1.1, 2.1, 8.1_

  - [x] 2.2 Write property test for MCP Client
    - **Property 10: MCP Server Status Display**
    - **Validates: Requirements 8.2, 8.4**

  - [x] 2.3 Add error handling for MCP operations
    - Create MCPError class
    - Handle server connection failures
    - Handle tool invocation errors
    - _Requirements: 1.1, 2.1_

- [x] 3. Implement Filesystem Tool
  - [x] 3.1 Create FilesystemTool class
    - Implement saveFile() method with path validation
    - Implement readFile() method
    - Implement listFiles() and deleteFile() methods
    - Add validatePath() and getUserFilePath() helpers
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Write property test for Filesystem Tool
    - **Property 1: File Operations Safety**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 3.3 Write unit tests for path validation
    - Test directory traversal prevention
    - Test safe path generation
    - Test file extension validation
    - _Requirements: 1.5_

- [x] 4. Implement Retry Mechanism
  - [x] 4.1 Create withRetry utility function
    - Implement exponential backoff logic
    - Add shouldRetry callback support
    - Add onRetry callback for logging
    - Handle rate limit (429) errors specially
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 4.2 Write property test for Retry Mechanism
    - **Property 4: Retry Behavior with Tracking**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 4.3 Write unit tests for retry edge cases
    - Test rate limit handling (no retry)
    - Test max retries exhaustion
    - Test exponential backoff timing
    - _Requirements: 3.5_

- [x] 5. Implement Configuration Validator
  - [x] 5.1 Create ConfigValidator class
    - Implement validateEnvVars() method
    - Implement validateMCPConfig() method
    - Implement testGroqConnection() method
    - Implement displayStatus() method
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.2 Write property test for Configuration Validator
    - **Property 6: Startup Validation**
    - **Validates: Requirements 5.1, 5.4, 5.5**

  - [x] 5.3 Write unit tests for validation cases
    - Test missing GROQ_API_KEY error
    - Test MCP enabled with no servers warning
    - Test configuration status display
    - _Requirements: 5.2, 5.3_

- [x] 6. Add startup validation to application
  - Integrate ConfigValidator in app startup
  - Display validation results in console
  - Throw errors for critical missing config
  - _Requirements: 5.1, 5.5_

- [x] 7. Checkpoint - Core Infrastructure
  - Ensure all tests pass
  - Verify MCP client can connect to filesystem server
  - Verify retry mechanism works with simulated failures
  - Verify configuration validator catches missing keys
  - Ask the user if questions arise

### Phase 2: AI Enhancements

- [x] 8. Implement Memory Manager
  - [x] 8.1 Create MemoryManager class
    - Implement createSession() method
    - Implement addMessage() method
    - Implement getContext() method
    - Implement summarizeOldMessages() method
    - Implement findInContext() method
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 8.2 Write property test for Memory Manager
    - **Property 5: Context Management**
    - **Validates: Requirements 4.1, 4.2, 4.4**

  - [x] 8.3 Write unit tests for memory features
    - Test context summarization at 10 messages
    - Test context retrieval by query
    - Test in-memory storage (not database)
    - _Requirements: 4.3, 4.5_

- [x] 9. Implement Search Tool
  - [x] 9.1 Create SearchTool class
    - Implement search() method with Brave API
    - Implement needsSearch() detection logic
    - Create SearchCache class for caching
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 9.2 Write property test for Search Tool
    - **Property 2: Search Result Formatting**
    - **Validates: Requirements 2.2, 2.4**

  - [x] 9.3 Write property test for Search Caching
    - **Property 3: Search Caching**
    - **Validates: Requirements 2.5**

  - [x] 9.4 Write unit tests for search detection
    - Test needsSearch() with various queries
    - Test cache TTL expiration
    - _Requirements: 2.1, 2.5_

- [x] 10. Implement Task Classifier
  - [x] 10.1 Create TaskClassifier class
    - Implement classify() method using AI
    - Implement classifyBatch() method
    - Implement validateDistribution() method
    - Implement override() method for manual correction
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 10.2 Write property test for Task Classifier
    - **Property 7: Task Classification**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

  - [x] 10.3 Write unit tests for classifier features
    - Test manual override functionality
    - Test distribution validation
    - _Requirements: 6.4_

- [-] 11. Implement State Machine for Theory Generation
  - [x] 11.1 Create TheoryStateMachine class
    - Implement state transitions
    - Implement executeNode() for each state
    - Implement event emission system
    - Implement getState() for inspection
    - Implement run() method
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 11.2 Write property test for State Machine Structure
    - **Property 8: State Machine Structure**
    - **Validates: Requirements 7.1, 7.4, 7.5**


  - [x] 11.3 Write property test for State Machine Error Handling
    - **Property 9: State Machine Error Handling**
    - **Validates: Requirements 7.2, 7.3**

- [x] 12. Integrate Retry Mechanism into Theory Generation
  - Update agent-fast.ts to use withRetry for section generation
  - Add retry tracking and logging
  - Use fallback content when retries exhausted
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 13. Checkpoint - AI Enhancements
  - Ensure all tests pass
  - Verify memory manager maintains context across messages
  - Verify search tool returns and caches results
  - Verify task classifier assigns correct difficulties
  - Verify state machine handles failures gracefully
  - Ask the user if questions arise

### Phase 3: UI and Integration

- [x] 14. Add UserFile model to database
  - Update prisma/schema.prisma with UserFile model
  - Run prisma generate and prisma db push
  - _Requirements: 1.1, 1.2_

- [x] 15. Create API endpoints for file operations
  - [x] 15.1 Create POST /api/files endpoint
    - Handle file save requests
    - Validate user authentication
    - Call FilesystemTool.saveFile()
    - Return download URL
    - _Requirements: 1.1, 1.3_

  - [x] 15.2 Create GET /api/files endpoint
    - List user's files
    - Support filtering by type
    - _Requirements: 1.2_

  - [x] 15.3 Create DELETE /api/files/[id] endpoint
    - Handle file deletion
    - Validate user owns the file
    - _Requirements: 1.1_

- [x] 16. Integrate Memory Manager into AI Chat
  - Update /api/chat endpoint to use MemoryManager
  - Create session on first message
  - Include context in AI prompts
  - Handle context summarization
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 17. Integrate MCP Tools into AI Chat
  - [x] 17.1 Add tool detection logic
    - Detect when user wants to save a file
    - Detect when user needs web search
    - _Requirements: 1.1, 2.1_

  - [x] 17.2 Add tool execution
    - Call FilesystemTool when needed
    - Call SearchTool when needed
    - Format tool results in chat response
    - _Requirements: 1.1, 2.1, 2.2_

  - [x] 17.3 Write integration tests for MCP Chat
    - Test file save through chat
    - Test web search through chat
    - _Requirements: 1.1, 2.1_

- [x] 18. Integrate State Machine into Theory Generation
  - Replace linear generation in agent-fast.ts with TheoryStateMachine
  - Emit progress events for UI
  - Handle state transitions and retries
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 19. Integrate Task Classifier into Task Generation
  - Update generateTasksFast() to use TaskClassifier
  - Validate distribution after classification
  - Allow manual overrides in UI
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 20. Create MCP Server Management UI
  - [x] 20.1 Create settings page component
    - Display list of configured MCP servers
    - Show server status (running/stopped/error)
    - Add enable/disable toggle
    - Display server logs
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 20.2 Write unit tests for UI components
    - Test server list rendering
    - Test status indicator colors
    - Test enable/disable functionality
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 21. Add MCP configuration to .kiro/settings/mcp.json
  - Add filesystem server configuration
  - Add brave-search server configuration
  - Document environment variables needed
  - _Requirements: 1.1, 2.1_

- [ ] 22. Update documentation
  - Add MCP integration guide to README
  - Document new API endpoints
  - Document environment variables
  - Add troubleshooting section
  - _Requirements: All_

- [x] 23. Final Checkpoint - Complete Integration
  - Ensure all tests pass
  - Test end-to-end: chat → save file → download
  - Test end-to-end: chat → web search → response
  - Test theory generation with state machine and retries
  - Test task classification with correct distribution
  - Verify MCP server management UI works
  - Ask the user if questions arise

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows

## Testing Configuration

All property-based tests should run with minimum 100 iterations:

```typescript
fc.assert(
  fc.asyncProperty(...),
  { numRuns: 100 }
)
```

Each property test must include a comment referencing the design property:

```typescript
// Feature: mcp-integration, Property 1: File Operations Safety
it('Property 1: File operations safety', async () => {
  // test implementation
})
```
