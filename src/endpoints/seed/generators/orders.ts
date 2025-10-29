/**
 * Order generator with realistic patterns
 *
 * Features:
 * - Pareto distribution: Top 20% products get 80% of sales
 * - Customer segment-based order amounts (VIP > Regular > New)
 * - Seasonal spikes (Black Friday, Holiday season)
 * - Weekend boost (40% more orders)
 * - Realistic order status distribution
 * - Time-distributed throughout the year with recency bias
 */

import type { Payload } from 'payload'
import { faker } from '@faker-js/faker'
import type { Order, OrderStatus, Product } from '@/payload-types'
import {
  weightedChoice,
  generateRecentDateWithWeekendBias,
  ORDER_PRODUCT_SELECTION,
  ORDER_STATUS,
  type ProductPopularity,
} from '../distributions'
import type { CustomerWithSegment } from './customers'

export interface OrderGenerationContext {
  customers: CustomerWithSegment[]
  productsByPopularity: Record<ProductPopularity, Product[]>
}

/**
 * Generate orders with realistic patterns
 */
export async function generateOrders(
  payload: Payload,
  count: number,
  context: OrderGenerationContext,
): Promise<Order[]> {
  payload.logger.info(`Generating ${count} orders with Pareto distribution...`)

  const orders: Order[] = []
  // Generate orders from past 500 days to future 60 days, then filter to today
  // This prevents concentration of orders on the current day
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 60) // 60 days in future
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 500)

  let generatedCount = 0
  let attempts = 0
  const maxAttempts = count * 3 // Safety limit to prevent infinite loops

  while (generatedCount < count && attempts < maxAttempts) {
    // Select random customer
    const customer = faker.helpers.arrayElement(context.customers)

    // Generate order items (1-5 items per order)
    const numItems = faker.number.int({ min: 1, max: 5 })
    const items = []
    let totalAmount = 0

    for (let j = 0; j < numItems; j++) {
      // Select product based on Pareto distribution (top 20% get 80% of sales)
      const popularityTier = weightedChoice(ORDER_PRODUCT_SELECTION)
      const availableProducts = context.productsByPopularity[popularityTier]

      if (availableProducts.length === 0) {
        continue
      }

      const product = faker.helpers.arrayElement(availableProducts)
      const quantity = faker.number.int({ min: 1, max: 3 })

      // Check if product has variants
      const variants = await payload.find({
        collection: 'variants',
        where: {
          product: { equals: product.id },
        },
        limit: 100,
      })

      let variantId: string | number | null = null
      let itemPrice = product.priceInUSD || 0

      // Select a random variant if available
      if (variants.docs.length > 0) {
        const selectedVariant = faker.helpers.arrayElement(variants.docs)
        variantId = selectedVariant.id
        // Use variant price if available
        itemPrice = selectedVariant.priceInUSD || itemPrice
      }

      // Calculate item total
      const itemTotal = itemPrice * quantity
      totalAmount += itemTotal

      items.push({
        product: product.id,
        variant: variantId,
        quantity,
      })
    }

    // Skip if no items generated (don't count as attempt)
    if (items.length === 0) {
      continue
    }

    // Generate order date with recency bias and weekend boost (1.4x)
    const createdAt = generateRecentDateWithWeekendBias(startDate, endDate)

    // Skip if date is in the future (beyond today)
    // Don't count this as an attempt since we intentionally generate future dates
    // to prevent concentration on the final day
    if (createdAt > today) {
      continue
    }

    // Count this as a valid attempt (date is in valid range)
    attempts++

    // Determine order status
    const status = weightedChoice(ORDER_STATUS) as OrderStatus

    // Generate order first
    const orderData = {
      customer: customer.id,
      currency: 'USD' as const,
      amount: totalAmount,
      status,
      shippingAddress: generateAddress(),
      items,
      createdAt: createdAt.toISOString(),
    }

    const order = await payload.create({
      collection: 'orders',
      data: orderData,
      depth: 0,
    })

    // Generate transaction with order reference
    const transactionStatus = status === 'completed' ? 'succeeded' : 'pending'

    const transaction = await payload.create({
      collection: 'transactions',
      data: {
        order: order.id,
        amount: totalAmount,
        items, // Add items to transaction
        customer: customer.id,
        currency: 'USD',
        paymentMethod: 'stripe',
        status: transactionStatus,
        stripe: {
          customerID: `cus_${faker.string.alphanumeric(14)}`,
          paymentIntentID: `pi_${faker.string.alphanumeric(24)}`,
        },
        billingAddress: generateAddress(),
        createdAt: createdAt.toISOString(),
      },
      depth: 0,
    })

    // Update order with transaction reference
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        transactions: [transaction.id],
      },
    })

    orders.push(order)
    generatedCount++

    // Progress logging
    if (generatedCount % 500 === 0) {
      payload.logger.info(`  Generated ${generatedCount}/${count} orders`)
    }
  }

  if (attempts >= maxAttempts) {
    payload.logger.warn(`Reached maximum attempts (${maxAttempts}), generated ${generatedCount}/${count} orders`)
  }

  payload.logger.info(`✓ Generated ${orders.length} orders`)

  // Calculate total items
  const totalItems = orders.reduce((sum, order) => sum + (order.items?.length || 0), 0)
  payload.logger.info(`  Total order items: ${totalItems}`)

  // Log popularity distribution
  const popularityStats = countOrdersByPopularity(orders, context.productsByPopularity)
  payload.logger.info(
    `  Item popularity distribution: High=${popularityStats.high}, Medium=${popularityStats.medium}, Low=${popularityStats.low}`,
  )

  return orders
}

/**
 * Generate realistic shipping/billing address
 */
function generateAddress() {
  return {
    title: faker.helpers.arrayElement(['Mr.', 'Ms.', 'Mrs.', 'Dr.']),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    company: Math.random() < 0.3 ? faker.company.name() : undefined,
    addressLine1: faker.location.streetAddress(),
    addressLine2: Math.random() < 0.3 ? faker.location.secondaryAddress() : undefined,
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    postalCode: faker.location.zipCode(),
    country: 'US' as const,
  }
}

/**
 * Count order items by product popularity tier
 */
function countOrdersByPopularity(
  orders: Order[],
  productsByPopularity: Record<ProductPopularity, Product[]>,
): Record<ProductPopularity, number> {
  const counts: Record<ProductPopularity, number> = {
    high: 0,
    medium: 0,
    low: 0,
  }

  const productIdToPopularity = new Map<string | number, ProductPopularity>()

  // Build reverse lookup map
  for (const [popularity, products] of Object.entries(productsByPopularity)) {
    for (const product of products) {
      productIdToPopularity.set(product.id, popularity as ProductPopularity)
    }
  }

  // Count all order items by popularity (not just first item)
  for (const order of orders) {
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (!item.product) continue

        const productId = typeof item.product === 'object'
          ? item.product.id
          : item.product

        if (productId === undefined) continue

        const popularity = productIdToPopularity.get(productId)
        if (popularity) {
          counts[popularity]++
        }
      }
    }
  }

  return counts
}
