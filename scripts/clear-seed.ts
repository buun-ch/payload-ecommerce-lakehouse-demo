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

// Delete in reverse dependency order (child → parent)
const collections: CollectionSlug[] = [
  // First: Delete child records that reference other collections
  'transactions', // References orders
  'orders', // References products, users, addresses
  'carts', // References products, users
  'variants', // References products, variantOptions
  'addresses', // References users (may be referenced by orders, but inline)

  // Second: Delete intermediate records
  'variantOptions', // References variantTypes
  'form-submissions', // References forms

  // Third: Delete parent records
  'products', // May be referenced by above
  // Note: 'users' will be handled separately to preserve admin users
  'variantTypes',
  'forms',
  'categories',
  'pages',
  'media',
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

      try {
        const result = await payload.db.deleteMany({
          collection,
          req,
          where: {},
        })

        // deleteMany returns either a number or an object with docs array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const count = typeof result === 'number' ? result : (result as any)?.docs?.length || 0

        // Also clear versions if enabled
        if (payload.collections[collection].config.versions) {
          await payload.db.deleteVersions({
            collection,
            req,
            where: {},
          })
        }

        console.log(` ✓ (${count} records)`)
      } catch (error) {
        console.log(` ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
        if (error instanceof Error && error.stack) {
          console.log(error.stack)
        }
      }
    }

    // Clear users except admins
    console.log('Clearing non-admin users...')
    try {
      // Get all users with admin role
      const adminUsers = await payload.find({
        collection: 'users',
        where: {
          roles: {
            equals: 'admin',
          },
        },
        limit: 1000,
      })

      const adminUserIds = adminUsers.docs.map((user) => user.id)
      console.log(`Found ${adminUserIds.length} admin user(s) to preserve`)

      // Delete non-admin users
      if (adminUserIds.length > 0) {
        await payload.db.deleteMany({
          collection: 'users',
          req,
          where: {
            id: {
              not_in: adminUserIds,
            },
          },
        })
      } else {
        // No admins found, delete all users
        await payload.db.deleteMany({
          collection: 'users',
          req,
          where: {},
        })
      }

      console.log('✓ Cleared non-admin users')
    } catch (error) {
      console.log('⚠️  Error clearing users:', error instanceof Error ? error.message : 'Unknown error')
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
