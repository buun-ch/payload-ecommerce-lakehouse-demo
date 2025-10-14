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
import { isCartAbandoned, generateRecentDate } from '../distributions'
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
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2024-12-31')

  let abandonedCount = 0
  let guestCount = 0

  for (let i = 0; i < count; i++) {
    // 70% of carts have customer, 30% are guest
    const isGuest = Math.random() < 0.3
    const customer = isGuest ? null : faker.helpers.arrayElement(context.customers)

    // Check if cart is abandoned (28% rate)
    const abandoned = isCartAbandoned()

    // Generate cart creation date
    const createdAt = generateRecentDate(startDate, endDate)

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

    if (abandoned) abandonedCount++
    if (isGuest) guestCount++

    // Progress logging
    if ((i + 1) % 200 === 0) {
      payload.logger.info(`  Generated ${i + 1}/${count} carts`)
    }
  }

  const actualAbandonmentRate = ((abandonedCount / count) * 100).toFixed(1)
  const guestRate = ((guestCount / count) * 100).toFixed(1)

  payload.logger.info(`✓ Generated ${count} carts`)
  payload.logger.info(
    `  Abandoned: ${abandonedCount} (${actualAbandonmentRate}%), Guest: ${guestCount} (${guestRate}%)`,
  )

  return carts
}
