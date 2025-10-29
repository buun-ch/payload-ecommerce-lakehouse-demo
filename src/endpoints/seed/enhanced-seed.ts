/**
 * Enhanced seed with realistic data distributions
 *
 * This seed generates ecommerce data with realistic patterns for analytics demos:
 * - Pareto distribution (80/20 rule) for product sales
 * - Customer segmentation (VIP, Regular, New)
 * - 28% cart abandonment rate
 * - Seasonal ordering patterns
 * - Log-normal price distribution
 *
 * Usage:
 * - Web UI: Click "Seed Database" in admin panel
 * - CLI: SEED_PRESET=medium pnpm payload seed
 *
 * Environment variables:
 * - SEED_PRESET: small | medium | large (default: medium)
 */

import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest } from 'payload'
import type { Media } from '@/payload-types'
import { getPreset, getPresetByName, type SeedPreset } from './presets'
import { generateProducts } from './generators/products'
import { generateCustomers } from './generators/customers'
import { generateOrders } from './generators/orders'
import { generateCarts } from './generators/carts'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

/**
 * Enhanced seed function with realistic data distributions
 */
export const enhancedSeed = async ({
  payload,
  req,
  preset,
}: {
  payload: Payload
  req: PayloadRequest
  preset?: SeedPreset
}): Promise<void> => {
  // Get preset configuration
  const presetName = preset || (process.env.SEED_PRESET as SeedPreset) || 'medium'
  const config = getPresetByName(presetName)

  payload.logger.info('='.repeat(80))
  payload.logger.info(`Starting enhanced seed: ${presetName.toUpperCase()} preset`)
  payload.logger.info('='.repeat(80))
  payload.logger.info(`Configuration:`)
  payload.logger.info(`  Description: ${config.description}`)
  payload.logger.info(`  Use case: ${config.useCase}`)
  payload.logger.info(`  Volumes:`)
  payload.logger.info(`    Categories: ${config.volumes.categories}`)
  payload.logger.info(`    Products: ${config.volumes.products}`)
  payload.logger.info(`    Users: ${config.volumes.users}`)
  payload.logger.info(`    Orders: ${config.volumes.orders}`)
  payload.logger.info(`    Carts: ${config.volumes.carts}`)
  payload.logger.info(`    Addresses: ${config.volumes.addresses}`)
  payload.logger.info('='.repeat(80))

  // Clear existing data
  payload.logger.info('Clearing existing data...')

  // Clear globals
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

  // Clear collections
  for (const collection of collections) {
    try {
      await payload.db.deleteMany({ collection, req, where: {} })
      if (payload.collections[collection].config.versions) {
        await payload.db.deleteVersions({ collection, req, where: {} })
      }
    } catch (error) {
      payload.logger.warn(
        `Error clearing ${collection}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Clear users except admins
  try {
    // Get all users with admin role
    const adminUsers = await payload.find({
      collection: 'users',
      where: {
        roles: {
          contains: 'admin',
        },
      },
      limit: 1000,
    })

    const adminUserIds = adminUsers.docs.map((user) => user.id)
    payload.logger.info(`Found ${adminUserIds.length} admin user(s) to preserve`)
    if (adminUserIds.length > 0) {
      payload.logger.info(`Preserving admin users: ${adminUsers.docs.map(u => u.email).join(', ')}`)
    }

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
  } catch (error) {
    payload.logger.warn('Error clearing users')
  }

  // Note: users_roles will be automatically cleaned by CASCADE foreign key constraints
  // No manual cleanup needed

  payload.logger.info('✓ Cleared existing data')
  payload.logger.info('')

  // Upload fallback no-image
  payload.logger.info('Uploading fallback no-image...')
  const noImagePath = path.resolve(__dirname, '../../../public/images/no-image.jpg')
  const noImageBuffer = fs.readFileSync(noImagePath)

  const noImageMedia = (await payload.create({
    collection: 'media',
    data: {
      alt: 'No image available',
    },
    file: {
      data: noImageBuffer,
      name: 'no-image.jpg',
      mimetype: 'image/jpeg',
      size: noImageBuffer.length,
    },
  })) as Media

  payload.logger.info('✓ Uploaded fallback no-image')
  payload.logger.info('')

  // Create variant types and options
  payload.logger.info('Creating variant types and options...')

  const sizeVariantType = await payload.create({
    collection: 'variantTypes',
    data: { name: 'size', label: 'Size' },
  })

  const colorVariantType = await payload.create({
    collection: 'variantTypes',
    data: { name: 'color', label: 'Color' },
  })

  const sizeOptions = ['S', 'M', 'L']
  const sizeVariantOptions = await Promise.all(
    sizeOptions.map((size) =>
      payload.create({
        collection: 'variantOptions',
        data: {
          label: size,
          value: size.toLowerCase(),
          variantType: sizeVariantType.id,
        },
      }),
    ),
  )

  const colorOptions = ['White', 'Black', 'Red', 'Blue', 'Yellow']
  const colorVariantOptions = await Promise.all(
    colorOptions.map((color) =>
      payload.create({
        collection: 'variantOptions',
        data: {
          label: color,
          value: color.toLowerCase(),
          variantType: colorVariantType.id,
        },
      }),
    ),
  )

  payload.logger.info('✓ Created variant types and options')
  payload.logger.info('')

  // Create categories
  payload.logger.info(`Creating ${config.volumes.categories} categories...`)

  // Categories ordered by Faker method availability (high to low)
  const categoryNames = [
    // Direct Faker methods available
    'Books',              // faker.book.title()
    'Food',               // faker.food.dish()
    'Automotive',         // faker.vehicle.manufacturer()
    'Music',              // faker.music.songName()

    // Easy combinations
    'Fashion',            // faker.color.human() + type
    'Electronics',        // brand + type
    'Sports & Outdoors',
    'Home & Garden',
    'Toys & Games',
    'Beauty & Personal Care',
    'Pet Supplies',
    'Office Products',
    'Baby Products',
    'Health & Wellness',
    'Garden & Outdoor',
    'Arts & Crafts',
    'Industrial & Scientific',
    'Handmade',
    'Jewelry',
    'Watches',
    'Luggage',
    'Shoes',
    'Tools',
    'Video Games',
    'Software',
  ]

  const selectedCategories = categoryNames.slice(0, config.volumes.categories)

  const categories = await Promise.all(
    selectedCategories.map((name) =>
      payload.create({
        collection: 'categories',
        data: {
          title: name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        },
      }),
    ),
  )

  payload.logger.info(`✓ Created ${categories.length} categories`)
  payload.logger.info('')

  // Generate products (with images for small/medium presets)
  const enableImageGeneration = presetName === 'small' || presetName === 'medium'
  const { products, productsByPopularity } = await generateProducts(
    payload,
    config.volumes.products,
    categories,
    [sizeVariantType, colorVariantType],
    {
      enableImageGeneration,
      fallbackImageId: noImageMedia.id,
      sizeVariantOptions,
      colorVariantOptions,
    },
  )
  payload.logger.info('')

  // Generate customers
  const { customers, customersBySegment } = await generateCustomers(
    payload,
    config.volumes.users,
  )
  payload.logger.info('')

  // Generate addresses
  payload.logger.info(`Generating ${config.volumes.addresses} addresses...`)
  // Note: Addresses would be generated here, but for simplicity we'll create them inline with orders
  payload.logger.info(`✓ Addresses will be created with orders`)
  payload.logger.info('')

  // Generate orders
  await generateOrders(payload, config.volumes.orders, {
    customers,
    productsByPopularity,
  })
  payload.logger.info('')

  // Generate carts
  await generateCarts(payload, config.volumes.carts, {
    customers,
    products,
  })
  payload.logger.info('')

  // Update globals (header, footer)
  payload.logger.info('Updating global navigation...')

  await Promise.all([
    payload.updateGlobal({
      slug: 'header',
      data: {
        navItems: [
          { link: { type: 'custom', label: 'Home', url: '/' } },
          { link: { type: 'custom', label: 'Shop', url: '/shop' } },
          { link: { type: 'custom', label: 'Account', url: '/account' } },
        ],
      },
    }),
    payload.updateGlobal({
      slug: 'footer',
      data: {
        navItems: [
          { link: { type: 'custom', label: 'Admin', url: '/admin' } },
          { link: { type: 'custom', label: 'Find my order', url: '/find-order' } },
        ],
      },
    }),
  ])

  payload.logger.info('✓ Updated global navigation')
  payload.logger.info('')

  // Summary
  payload.logger.info('='.repeat(80))
  payload.logger.info('✓ Seed completed successfully!')
  payload.logger.info('='.repeat(80))
  payload.logger.info('Summary:')
  payload.logger.info(`  Categories: ${categories.length}`)
  payload.logger.info(`  Products: ${products.length}`)
  payload.logger.info(
    `    - High popularity: ${productsByPopularity.high.length} (20%)`,
  )
  payload.logger.info(
    `    - Medium popularity: ${productsByPopularity.medium.length} (30%)`,
  )
  payload.logger.info(
    `    - Low popularity: ${productsByPopularity.low.length} (50%)`,
  )
  payload.logger.info(`  Customers: ${customers.length}`)
  payload.logger.info(`    - VIP: ${customersBySegment.VIP.length} (5%)`)
  payload.logger.info(`    - Regular: ${customersBySegment.Regular.length} (25%)`)
  payload.logger.info(`    - New: ${customersBySegment.New.length} (70%)`)
  payload.logger.info(`  Orders: ${config.volumes.orders}`)
  payload.logger.info(`  Carts: ${config.volumes.carts}`)
  payload.logger.info('='.repeat(80))
  payload.logger.info('')
  payload.logger.info('Next steps:')
  payload.logger.info('1. Test the data stack pipeline:')
  payload.logger.info('   cd data/ingestion && python payload_pipeline.py')
  payload.logger.info('2. Verify Pareto distribution (top 20% products = 80% sales):')
  payload.logger.info('   Check order statistics in admin panel or run analytics queries')
  payload.logger.info('3. Check cart abandonment rate (should be ~28%):')
  payload.logger.info('   Query carts where purchasedAt is null')
  payload.logger.info('='.repeat(80))
}
