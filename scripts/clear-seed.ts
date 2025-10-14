#!/usr/bin/env tsx
/**
 * Clear all seeded data from the database
 *
 * This script removes all data from collections and resets globals,
 * without inserting new data.
 *
 * Usage:
 *   pnpm clear-seed
 *   tsx scripts/clear-seed.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

// IMPORTANT: Load environment variables BEFORE importing payload.config
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectDir = path.resolve(__dirname, '..')

const nodeEnv = process.env.NODE_ENV || 'development'
const isTest = nodeEnv === 'test'

const envFiles = [
  '.env',
  `.env.${nodeEnv}`,
  !isTest && '.env.local',
  `.env.${nodeEnv}.local`,
].filter(Boolean) as string[]

for (const file of envFiles) {
  const filePath = path.join(projectDir, file)
  if (existsSync(filePath)) {
    dotenv.config({ path: filePath })
  }
}

if (!process.env.PAYLOAD_SECRET || !process.env.DATABASE_URI) {
  console.error('ERROR: Required environment variables not found')
  process.exit(1)
}

import type { CollectionSlug, GlobalSlug } from 'payload'

const collections: CollectionSlug[] = [
  'categories',
  'media',
  'pages',
  'products',
  'forms',
  'form-submissions',
  'variants',
  'variantOptions',
  'variantTypes',
  'carts',
  'transactions',
  'addresses',
  'orders',
  'users',
]

const globals: GlobalSlug[] = ['header', 'footer']

async function clearSeedData() {
  console.log('='.repeat(80))
  console.log('Clear Seed Data')
  console.log('='.repeat(80))
  console.log('⚠️  WARNING: This will delete ALL data from the following collections:')
  collections.forEach((col) => console.log(`  - ${col}`))
  console.log('')
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...')
  console.log('='.repeat(80))

  // Wait 5 seconds to give user time to cancel
  await new Promise((resolve) => setTimeout(resolve, 5000))

  try {
    // Dynamically import modules AFTER env vars are set
    const { getPayload } = await import('payload')
    const { createLocalReq } = await import('payload')
    const { default: config } = await import('../src/payload.config.js')

    // Initialize Payload
    const payload = await getPayload({ config })
    const req = await createLocalReq({}, payload)

    console.log('')
    console.log('Clearing data...')
    console.log('')

    // Clear globals
    console.log('Clearing globals...')
    await Promise.all(
      globals.map((global) =>
        payload.updateGlobal({
          slug: global,
          data: { navItems: [] },
          depth: 0,
          context: { disableRevalidate: true },
        }),
      ),
    )
    console.log('✓ Cleared globals')

    // Clear collections
    for (const collection of collections) {
      process.stdout.write(`Clearing ${collection}...`)

      const count = await payload.db.deleteMany({
        collection,
        req,
        where: {},
      })

      // Also clear versions if enabled
      if (payload.collections[collection].config.versions) {
        await payload.db.deleteVersions({
          collection,
          req,
          where: {},
        })
      }

      console.log(` ✓`)
    }

    console.log('')
    console.log('='.repeat(80))
    console.log('✓ All seed data cleared successfully!')
    console.log('='.repeat(80))

    process.exit(0)
  } catch (error) {
    console.error('Error clearing seed data:', error)
    process.exit(1)
  }
}

clearSeedData()
