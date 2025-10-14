#!/usr/bin/env tsx
/**
 * CLI script to seed the database with realistic data
 *
 * Usage:
 *   pnpm seed                    # Default: medium preset
 *   pnpm seed:small              # Small preset
 *   pnpm seed:medium             # Medium preset
 *   pnpm seed:large              # Large preset
 *
 * Or directly:
 *   SEED_PRESET=small tsx scripts/seed.ts
 *   SEED_PRESET=medium tsx scripts/seed.ts
 *   SEED_PRESET=large tsx scripts/seed.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

// IMPORTANT: Load environment variables BEFORE importing payload.config
// This ensures PAYLOAD_SECRET and DATABASE_URI are available when config is evaluated
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectDir = path.resolve(__dirname, '..')

const nodeEnv = process.env.NODE_ENV || 'development'
const isTest = nodeEnv === 'test'

// Load .env files in Next.js order
// https://nextjs.org/docs/pages/guides/environment-variables#environment-variable-load-order
// Later files override earlier ones
const envFiles = [
  '.env',                      // 1. Base (lowest priority)
  `.env.${nodeEnv}`,          // 2. Environment-specific
  !isTest && '.env.local',     // 3. Local overrides (not for test)
  `.env.${nodeEnv}.local`,    // 4. Environment-specific local (highest priority)
].filter(Boolean) as string[]

for (const file of envFiles) {
  const filePath = path.join(projectDir, file)
  if (existsSync(filePath)) {
    dotenv.config({ path: filePath })
  }
}

// Verify critical env vars are loaded
if (!process.env.PAYLOAD_SECRET) {
  console.error('\nERROR: PAYLOAD_SECRET not found in environment variables')
  console.error('Checked files:', envFiles)
  console.error('Project directory:', projectDir)
  console.error('\nPlease create a .env file with:')
  console.error('  PAYLOAD_SECRET=your-secret-key-here')
  process.exit(1)
}

if (!process.env.DATABASE_URI) {
  console.error('\nERROR: DATABASE_URI not found in environment variables')
  console.error('\nPlease create a .env file with:')
  console.error('  DATABASE_URI=postgres://user:password@host:port/database')
  process.exit(1)
}

async function run() {
  const preset = process.env.SEED_PRESET || 'medium'

  console.log('=' .repeat(80))
  console.log('PayloadCMS Enhanced Seed')
  console.log('='.repeat(80))
  console.log(`Preset: ${preset.toUpperCase()}`)
  console.log('='.repeat(80))
  console.log('')

  try {
    // Dynamically import modules AFTER env vars are set
    const { getPayload } = await import('payload')
    const { createLocalReq } = await import('payload')
    const { default: config } = await import('../src/payload.config.js')
    const { seed } = await import('../src/endpoints/seed/index.js')

    // Initialize Payload
    const payload = await getPayload({ config })

    // Create a local request (needed for transactions)
    const req = await createLocalReq({}, payload)

    // Run seed
    await seed({ payload, req })

    console.log('')
    console.log('='.repeat(80))
    console.log('✓ Seed completed successfully!')
    console.log('='.repeat(80))

    process.exit(0)
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  }
}

run()
