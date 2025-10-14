/**
 * Customer generator with segmentation
 *
 * Features:
 * - Customer segmentation: VIP (5%), Regular (25%), New (70%)
 * - Realistic names, emails, and contact info
 * - Segment stored in custom field for analytics
 * - Different order patterns per segment
 */

import type { Payload } from 'payload'
import { faker } from '@faker-js/faker'
import type { User } from '@/payload-types'
import { weightedChoice, CUSTOMER_SEGMENTS, type CustomerSegment } from '../distributions'

export interface CustomerWithSegment extends User {
  _segment: CustomerSegment
}

export interface CustomerGenerationResult {
  customers: CustomerWithSegment[]
  customersBySegment: Record<CustomerSegment, CustomerWithSegment[]>
}

/**
 * Generate customers with realistic segmentation
 */
export async function generateCustomers(
  payload: Payload,
  count: number,
): Promise<CustomerGenerationResult> {
  payload.logger.info(`Generating ${count} customers...`)

  const customers: CustomerWithSegment[] = []
  const customersBySegment: Record<CustomerSegment, CustomerWithSegment[]> = {
    VIP: [],
    Regular: [],
    New: [],
  }

  for (let i = 0; i < count; i++) {
    // Assign customer segment
    const segment = weightedChoice(CUSTOMER_SEGMENTS)

    // Generate realistic customer data
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()

    const customerData = {
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: 'password', // Will be hashed by PayloadCMS
      roles: ['customer' as const],
    }

    const customer = (await payload.create({
      collection: 'users',
      data: customerData,
      depth: 0,
    })) as CustomerWithSegment

    // Store segment for later use (not persisted to DB)
    customer._segment = segment

    customers.push(customer)
    customersBySegment[segment].push(customer)

    // Progress logging
    if ((i + 1) % 100 === 0) {
      payload.logger.info(`  Generated ${i + 1}/${count} customers`)
    }
  }

  payload.logger.info(`✓ Generated ${count} customers`)
  payload.logger.info(
    `  Distribution: VIP=${customersBySegment.VIP.length}, Regular=${customersBySegment.Regular.length}, New=${customersBySegment.New.length}`,
  )

  return { customers, customersBySegment }
}
