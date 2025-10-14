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
import type { Order, Product, Transaction } from '@/payload-types'
import {
  weightedChoice,
  generateOrderAmount,
  generateRecentDate,
  ORDER_PRODUCT_SELECTION,
  ORDER_STATUS,
  type ProductPopularity,
  type CustomerSegment,
} from '../distributions'
import type { CustomerWithSegment } from './customers'
import type { ProductGenerationResult } from './products'

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
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2024-12-31')

  for (let i = 0; i < count; i++) {
    // Select random customer
    const customer = faker.helpers.arrayElement(context.customers)
    const segment = customer._segment

    // Select product based on Pareto distribution (top 20% get 80% of sales)
    const popularityTier = weightedChoice(ORDER_PRODUCT_SELECTION)
    const availableProducts = context.productsByPopularity[popularityTier]

    if (availableProducts.length === 0) {
      payload.logger.warn(`No products available for popularity tier: ${popularityTier}`)
      continue
    }

    const product = faker.helpers.arrayElement(availableProducts)

    // Generate order amount based on customer segment
    const amount = generateOrderAmount(segment)

    // Generate order date with recency bias
    const createdAt = generateRecentDate(startDate, endDate)

    // Determine order status
    const status = weightedChoice(ORDER_STATUS)

    // Generate transaction
    const transactionStatus = status === 'completed' ? 'succeeded' : 'pending'

    const transaction = await payload.create({
      collection: 'transactions',
      data: {
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

    // Generate order
    const orderData = {
      customer: customer.id,
      currency: 'USD' as const,
      amount,
      status,
      transactions: [transaction.id],
      shippingAddress: generateAddress(),
      items: [
        {
          product: product.id,
          quantity: faker.number.int({ min: 1, max: 3 }),
        },
      ],
      createdAt: createdAt.toISOString(),
    }

    const order = await payload.create({
      collection: 'orders',
      data: orderData,
      depth: 0,
    })

    orders.push(order)

    // Progress logging
    if ((i + 1) % 500 === 0) {
      payload.logger.info(`  Generated ${i + 1}/${count} orders`)
    }
  }

  payload.logger.info(`✓ Generated ${count} orders`)

  // Log popularity distribution
  const popularityStats = countOrdersByPopularity(orders, context.productsByPopularity)
  payload.logger.info(
    `  Product popularity distribution: High=${popularityStats.high}, Medium=${popularityStats.medium}, Low=${popularityStats.low}`,
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
 * Count orders by product popularity tier
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

  // Count orders by popularity
  for (const order of orders) {
    if (order.items && order.items.length > 0) {
      const productId = typeof order.items[0].product === 'object'
        ? order.items[0].product.id
        : order.items[0].product

      const popularity = productIdToPopularity.get(productId)
      if (popularity) {
        counts[popularity]++
      }
    }
  }

  return counts
}
