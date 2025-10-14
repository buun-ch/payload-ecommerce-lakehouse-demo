/**
 * Product generator with realistic distributions
 *
 * Features:
 * - Log-normal price distribution (most products budget, few luxury)
 * - Pareto popularity assignment (for biased order selection)
 * - 40% of products have variants (size/color)
 * - 15% out of stock (realistic inventory)
 * - Realistic product names and descriptions
 */

import type { Payload } from 'payload'
import { faker } from '@faker-js/faker'
import type { Category, Product, VariantType } from '@/payload-types'
import {
  weightedChoice,
  generatePrice,
  PRODUCT_POPULARITY,
  INVENTORY_STATUS,
  VARIANTS_ENABLED_RATE,
  type ProductPopularity,
} from '../distributions'

export interface ProductGenerationResult {
  products: Product[]
  productsByPopularity: Record<ProductPopularity, Product[]>
}

/**
 * Generate products with realistic distributions
 */
export async function generateProducts(
  payload: Payload,
  count: number,
  categories: Category[],
  variantTypes: VariantType[],
): Promise<ProductGenerationResult> {
  payload.logger.info(`Generating ${count} products...`)

  const products: Product[] = []
  const productsByPopularity: Record<ProductPopularity, Product[]> = {
    high: [],
    medium: [],
    low: [],
  }

  for (let i = 0; i < count; i++) {
    // Assign popularity tier (for later biased selection in orders)
    const popularity = weightedChoice(PRODUCT_POPULARITY)

    // Generate price based on log-normal distribution
    const priceInUSD = generatePrice()

    // Determine if product has variants
    const enableVariants = Math.random() < VARIANTS_ENABLED_RATE

    // Determine inventory status
    const inventoryStatus = weightedChoice(INVENTORY_STATUS)
    const inventory =
      inventoryStatus === 'out_of_stock' ? 0 : faker.number.int({ min: 50, max: 500 })

    // Select random categories (1-3)
    const numCategories = faker.number.int({ min: 1, max: 3 })
    const selectedCategories = faker.helpers.arrayElements(categories, numCategories)

    // Generate realistic product data
    const productData = {
      title: faker.commerce.productName(),
      slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
      priceInUSD,
      priceInUSDEnabled: true,
      inventory,
      enableVariants,
      variantTypes: enableVariants ? variantTypes.map((vt) => vt.id) : [],
      categories: selectedCategories.map((cat) => cat.id),
      _status: 'published' as const,
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: faker.commerce.productDescription(),
                },
              ],
            },
          ],
        },
      },
    }

    const product = await payload.create({
      collection: 'products',
      data: productData,
      depth: 0,
    })

    products.push(product)
    productsByPopularity[popularity].push(product)

    // Progress logging
    if ((i + 1) % 50 === 0) {
      payload.logger.info(`  Generated ${i + 1}/${count} products`)
    }
  }

  payload.logger.info(`✓ Generated ${count} products`)
  payload.logger.info(
    `  Distribution: High=${productsByPopularity.high.length}, Medium=${productsByPopularity.medium.length}, Low=${productsByPopularity.low.length}`,
  )

  return { products, productsByPopularity }
}
