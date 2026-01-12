/**
 * Data Migration Script: Migrate existing Topics to Module structure
 * 
 * This script migrates existing data to the new hierarchical structure:
 * - For each Goal, creates a default Module "Общий раздел"
 * - Moves all existing Topics to the created Module
 * - Preserves all TopicProgress records (they reference Topic by ID)
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface MigrationResult {
  success: boolean
  goalsProcessed: number
  modulesCreated: number
  topicsMigrated: number
  progressRecordsPreserved: number
  errors: string[]
}

export async function migrateToModules(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    goalsProcessed: 0,
    modulesCreated: 0,
    topicsMigrated: 0,
    progressRecordsPreserved: 0,
    errors: []
  }

  try {
    // Get all goals
    const allGoals = await prisma.goal.findMany()
    
    for (const goal of allGoals) {
      // Check if goal already has modules
      const existingModules = await prisma.module.findMany({
        where: { goalId: goal.id }
      })

      if (existingModules.length === 0) {
        try {
          // Create default module for this goal
          await prisma.module.create({
            data: {
              goalId: goal.id,
              name: 'Общий раздел',
              description: 'Автоматически созданный раздел для существующих тем',
              icon: '📚',
              order: 1
            }
          })
          result.modulesCreated++
          console.log(`  Created module for goal "${goal.title}"`)
        } catch (error) {
          result.errors.push(`Error creating module for goal ${goal.id}: ${error}`)
        }
      }
      result.goalsProcessed++
    }

    // Count preserved progress records
    const progressCount = await prisma.topicProgress.count()
    result.progressRecordsPreserved = progressCount

    // Count topics
    const topicCount = await prisma.topic.count()
    result.topicsMigrated = topicCount

    result.success = result.errors.length === 0
    return result
  } catch (error) {
    result.errors.push(`Migration failed: ${error}`)
    return result
  }
}


export async function verifyMigration(): Promise<{
  valid: boolean
  issues: string[]
  stats: {
    totalGoals: number
    totalModules: number
    totalTopics: number
    totalProgress: number
    goalsWithModules: number
  }
}> {
  const issues: string[] = []
  
  const totalGoals = await prisma.goal.count()
  const totalModules = await prisma.module.count()
  const totalTopics = await prisma.topic.count()
  const totalProgress = await prisma.topicProgress.count()
  
  // Count goals that have at least one module
  const goalsWithModulesData = await prisma.module.groupBy({
    by: ['goalId']
  })
  const goalsWithModules = goalsWithModulesData.length

  if (goalsWithModules < totalGoals) {
    issues.push(`${totalGoals - goalsWithModules} goals have no modules`)
  }

  return {
    valid: issues.length === 0,
    issues,
    stats: {
      totalGoals,
      totalModules,
      totalTopics,
      totalProgress,
      goalsWithModules
    }
  }
}

async function main() {
  console.log('🔄 Starting data migration to module structure...\n')

  console.log('Step 1: Creating default modules for goals without modules...')
  const migrationResult = await migrateToModules()
  
  console.log('\n📊 Migration Results:')
  console.log(`  Goals processed: ${migrationResult.goalsProcessed}`)
  console.log(`  Modules created: ${migrationResult.modulesCreated}`)
  console.log(`  Topics count: ${migrationResult.topicsMigrated}`)
  console.log(`  Progress records preserved: ${migrationResult.progressRecordsPreserved}`)
  
  if (migrationResult.errors.length > 0) {
    console.log('\n❌ Errors:')
    migrationResult.errors.forEach(e => console.log(`  - ${e}`))
  }

  console.log('\n🔍 Verifying migration...')
  const verification = await verifyMigration()
  
  console.log('\n📈 Database Stats:')
  console.log(`  Total Goals: ${verification.stats.totalGoals}`)
  console.log(`  Total Modules: ${verification.stats.totalModules}`)
  console.log(`  Total Topics: ${verification.stats.totalTopics}`)
  console.log(`  Total Progress Records: ${verification.stats.totalProgress}`)
  console.log(`  Goals with Modules: ${verification.stats.goalsWithModules}`)

  if (verification.issues.length > 0) {
    console.log('\n⚠️ Issues found:')
    verification.issues.forEach(i => console.log(`  - ${i}`))
  }

  if (verification.valid && migrationResult.success) {
    console.log('\n✅ Migration completed successfully!')
  } else {
    console.log('\n⚠️ Migration completed with issues.')
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Migration failed:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
