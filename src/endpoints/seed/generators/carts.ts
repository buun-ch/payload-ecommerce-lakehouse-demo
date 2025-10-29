/**
 * Cart generator with abandonment modeling
 *
 * Features:
 * - 28% cart abandonment rate (industry average)
 * - 70% of carts have customer, 30% are guest carts
 * - Realistic cart items and subtotals
 * - Time-distributed throughout the year
 */

import type { Payload } from 'payload'
import { faker } from '@faker-js/faker'
import type { Cart, Product } from '@/payload-types'
import { isCartAbandoned, generateRecentDateWithWeekendBias } from '../distributions'
import type { CustomerWithSegment } from './customers'

export interface CartGenerationContext {
  customers: CustomerWithSegment[]
  products: Product[]
}

/**
 * Generate carts with realistic abandonment patterns
 */
export async function generateCarts(
  payload: Payload,
  count: number,
  context: CartGenerationContext,
): Promise<Cart[]> {
  payload.logger.info(`Generating ${count} carts (28% abandonment rate)...`)

  const carts: Cart[] = []
  // Generate carts from past 500 days to future 60 days, then filter to today
  // This prevents concentration of carts on the current day
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 60) // 60 days in future
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 500)

  let abandonedCount = 0
  let guestCount = 0
  let generatedCount = 0
  let attempts = 0
  const maxAttempts = count * 3 // Safety limit to prevent infinite loops

  while (generatedCount < count && attempts < maxAttempts) {
    attempts++

    // 70% of carts have customer, 30% are guest
    const isGuest = Math.random() < 0.3
    const customer = isGuest ? null : faker.helpers.arrayElement(context.customers)

    // Check if cart is abandoned (28% rate)
    const abandoned = isCartAbandoned()

    // Generate cart creation date with weekend boost (1.4x)
    const createdAt = generateRecentDateWithWeekendBias(startDate, endDate)

    // Skip if date is in the future (beyond today)
    if (createdAt > today) {
      continue
    }

    // Select 1-3 products for cart
    const numItems = faker.number.int({ min: 1, max: 3 })
    const selectedProducts = faker.helpers.arrayElements(context.products, numItems)

    const items = await Promise.all(
      selectedProducts.map(async (product) => {
        // Check if product has variants
        const variants = await payload.find({
          collection: 'variants',
          where: {
            product: { equals: product.id },
          },
          limit: 100,
        })

        let variantId: string | number | null = null

        // Select a random variant if available
        if (variants.docs.length > 0) {
          const selectedVariant = faker.helpers.arrayElement(variants.docs)
          variantId = selectedVariant.id
        }

        return {
          product: product.id,
          variant: variantId,
          quantity: faker.number.int({ min: 1, max: 2 }),
        }
      }),
    )

    // Calculate subtotal
    const subtotal = faker.number.int({ min: 2000, max: 20000 })

    // Set purchasedAt only if not abandoned
    const purchasedAt = abandoned
      ? null
      : faker.date
        .between({
          from: createdAt,
          to: endDate,
        })
        .toISOString()

    const cartData = {
      customer: customer?.id || null,
      currency: 'USD' as const,
      items,
      subtotal,
      purchasedAt,
      createdAt: createdAt.toISOString(),
    }

    const cart = await payload.create({
      collection: 'carts',
      data: cartData,
      depth: 0,
    })

    carts.push(cart)
    generatedCount++

    if (abandoned) abandonedCount++
    if (isGuest) guestCount++

    // Progress logging
    if (generatedCount % 200 === 0) {
      payload.logger.info(`  Generated ${generatedCount}/${count} carts`)
    }
  }

  if (attempts >= maxAttempts) {
    payload.logger.warn(`Reached maximum attempts (${maxAttempts}), generated ${generatedCount}/${count} carts`)
  }

  const actualAbandonmentRate = carts.length > 0 ? ((abandonedCount / carts.length) * 100).toFixed(1) : '0.0'
  const guestRate = carts.length > 0 ? ((guestCount / carts.length) * 100).toFixed(1) : '0.0'

  payload.logger.info(`✓ Generated ${carts.length} carts`)
  payload.logger.info(
    `  Abandoned: ${abandonedCount} (${actualAbandonmentRate}%), Guest: ${guestCount} (${guestRate}%)`,
  )

  return carts
}
