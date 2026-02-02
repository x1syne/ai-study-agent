/**
 * Test Chat Queries for MADI Parser
 * 
 * This script simulates the chat interface testing by calling the ScheduleTool
 * with different query types that a student might ask.
 */

import { ScheduleTool } from '../mcp/tools/schedule'

async function testChatQueries() {
  console.log('=== Testing MADI Parser Through Chat Interface ===\n')

  const tool = new ScheduleTool()

  // Test queries that students might ask
  const queries = [
    {
      name: 'когда у тебя пары?',
      params: { query_type: 'day' as const, info_type: 'schedule' as const }
    },
    {
      name: 'когда экзамены?',
      params: { query_type: 'day' as const, info_type: 'exams' as const }
    },
    {
      name: 'какая у тебя кафедра?',
      params: { query_type: 'day' as const, info_type: 'department' as const }
    },
    {
      name: 'с какими группами работаешь?',
      params: { query_type: 'day' as const, info_type: 'groups' as const }
    },
    {
      name: 'есть ли заочка?',
      params: { query_type: 'day' as const, info_type: 'all' as const }
    }
  ]

  for (const query of queries) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`Query: "${query.name}"`)
    console.log(`Params: ${JSON.stringify(query.params)}`)
    console.log('='.repeat(70))

    try {
      const result = await tool.execute(query.params)
      console.log('\nResult:')
      console.log(result)
    } catch (error) {
      console.error('\nError:', error)
    }

    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n' + '='.repeat(70))
  console.log('=== Chat Interface Testing Complete ===')
}

// Run the tests
testChatQueries().catch(console.error)
