/**
 * Product generator with realistic distributions
 *
 * Features:
 * - Log-normal price distribution (most products budget, few luxury)
 * - Pareto popularity assignment (for biased order selection)
 * - 40% of products have variants (size/color)
 * - Realistic inventory distribution (10% out of stock, 10% low stock, 20% limited, 40% normal, 20% high)
 * - Realistic product names and descriptions
 * - Optional Pexels image generation (for small/medium presets)
 */

import type { Payload } from 'payload'
import { faker } from '@faker-js/faker'
import { createClient } from 'pexels'
import type { Category, Product, VariantType, VariantOption, Media } from '@/payload-types'
import {
  weightedChoice,
  generatePrice,
  generateInventory,
  PRODUCT_POPULARITY,
  CATEGORY_PRODUCT_TYPES,
  TECH_BRANDS,
  TECH_ADJECTIVES,
  FASHION_STYLES,
  FASHION_MATERIALS,
  getVariantTypesForProduct,
  type ProductPopularity,
} from '../distributions'

const PEXELS_API_KEY = process.env.PEXELS_API_KEY

/**
 * Generate a realistic product name based on category using Faker methods
 * Prioritizes direct Faker methods where available
 */
function generateProductName(category: Category): { title: string; productType: string } {
  const categoryName = category.title || 'Electronics'
  const productTypes = CATEGORY_PRODUCT_TYPES[categoryName] || CATEGORY_PRODUCT_TYPES['Electronics']

  switch (categoryName) {
    case 'Books': {
      // Use Faker's book title directly
      const title = faker.book.title()
      return { title, productType: 'Book' }
    }

    case 'Food': {
      // Use Faker's dish name directly
      const title = faker.food.dish()
      return { title, productType: 'Food' }
    }

    case 'Automotive': {
      // Use vehicle manufacturer + part type
      const partType = faker.helpers.arrayElement(productTypes)
      const manufacturer = faker.vehicle.manufacturer()
      const title = `${manufacturer} ${partType}`
      return { title, productType: partType }
    }

    case 'Music': {
      // 50% chance of album (song name) or instrument
      const isAlbum = faker.datatype.boolean()
      if (isAlbum) {
        const title = faker.music.songName()
        return { title, productType: 'Album' }
      } else {
        const instrument = faker.helpers.arrayElement(productTypes)
        const brand = faker.vehicle.manufacturer() // Reuse for brand names
        const title = `${brand} ${instrument}`
        return { title, productType: instrument }
      }
    }

    case 'Fashion': {
      // Color + material + product type
      const productType = faker.helpers.arrayElement(productTypes)
      const color = faker.color.human()
      const material = faker.helpers.arrayElement(FASHION_MATERIALS)

      // 50% chance to include style
      const includeStyle = faker.datatype.boolean()
      if (includeStyle) {
        const style = faker.helpers.arrayElement(FASHION_STYLES)
        const title = `${color} ${style} ${productType}`
        return { title, productType }
      } else {
        const title = `${color} ${material} ${productType}`
        return { title, productType }
      }
    }

    case 'Electronics': {
      // Brand + adjective + product type
      const productType = faker.helpers.arrayElement(productTypes)
      const brand = faker.helpers.arrayElement(TECH_BRANDS)
      const adjective = faker.helpers.arrayElement(TECH_ADJECTIVES)
      const title = `${brand} ${adjective} ${productType}`
      return { title, productType }
    }

    case 'Sports & Outdoors': {
      // Brand + adjective + product type
      const productType = faker.helpers.arrayElement(productTypes)
      const brand = faker.company.name().split(' ')[0] // Use first word of company name
      const adjective = faker.helpers.arrayElement(['Pro', 'Elite', 'Adventure', 'Outdoor', 'Sport'])
      const title = `${brand} ${adjective} ${productType}`
      return { title, productType }
    }

    case 'Beauty & Personal Care': {
      // Brand + adjective + product type
      const productType = faker.helpers.arrayElement(productTypes)
      const brand = faker.company.name().split(' ')[0]
      const adjective = faker.helpers.arrayElement(['Luxury', 'Natural', 'Organic', 'Premium', 'Essential'])
      const title = `${brand} ${adjective} ${productType}`
      return { title, productType }
    }

    case 'Toys & Games': {
      const productType = faker.helpers.arrayElement(productTypes)
      const adjective = faker.helpers.arrayElement(['Super', 'Fun', 'Classic', 'Ultimate', 'Deluxe'])
      const title = `${adjective} ${productType}`
      return { title, productType }
    }

    case 'Software': {
      const productType = faker.helpers.arrayElement(productTypes)
      const adjective = faker.helpers.arrayElement(['Pro', 'Ultimate', 'Enterprise', 'Cloud', 'Smart'])
      const title = `${adjective} ${productType}`
      return { title, productType }
    }

    default: {
      // Default: adjective + product type
      const productType = faker.helpers.arrayElement(productTypes)
      const adjective = faker.commerce.productAdjective()
      const title = `${adjective} ${productType}`
      return { title, productType }
    }
  }
}

export interface ProductGenerationResult {
  products: Product[]
  productsByPopularity: Record<ProductPopularity, Product[]>
}

/**
 * Generate and upload image from Pexels based on product type
 */
async function generateImageForProduct(
  payload: Payload,
  _categoryName: string,
  productType: string,
): Promise<number | null> {
  if (!PEXELS_API_KEY) {
    return null
  }

  try {
    const client = createClient(PEXELS_API_KEY)

    // Use product type as search query (already clean keyword like "Laptop", "Shirt", etc)
    const searchQuery = productType.toLowerCase()

    // Randomize page number (1-80) to get different images each time
    // This prevents reusing the same 10 images for all products
    const randomPage = faker.number.int({ min: 1, max: 80 })

    const result = await client.photos.search({
      query: searchQuery,
      per_page: 1, // Get only 1 image per request
      page: randomPage,
      orientation: 'square',
    })

    if ('photos' in result && result.photos.length > 0) {
      const photo = result.photos[0]
      const imageUrl = photo.src.large

      // Download image
      const response = await fetch(imageUrl)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Generate unique filename from product type + random ID
      const uniqueId = faker.string.alphanumeric(8)
      const filename = `${faker.helpers.slugify(productType).toLowerCase()}-${uniqueId}.jpg`

      // Upload to Payload media collection
      const media = (await payload.create({
        collection: 'media',
        data: {
          alt: productType,
        },
        file: {
          data: buffer,
          name: filename,
          mimetype: 'image/jpeg',
          size: buffer.length,
        },
      })) as Media

      return media.id
    }
  } catch (error) {
    payload.logger.warn(`Failed to generate image for "${productType}": ${error}`)
  }

  return null
}

/**
 * Generate products with realistic distributions
 */
export async function generateProducts(
  payload: Payload,
  count: number,
  categories: Category[],
  variantTypes: VariantType[],
  options: {
    enableImageGeneration?: boolean
    fallbackImageId?: number
    sizeVariantOptions?: VariantOption[]
    colorVariantOptions?: VariantOption[]
  } = {},
): Promise<ProductGenerationResult> {
  const { enableImageGeneration = false, fallbackImageId, sizeVariantOptions, colorVariantOptions } =
    options

  if (enableImageGeneration && !PEXELS_API_KEY) {
    payload.logger.warn(
      `PEXELS_API_KEY not set. ${fallbackImageId ? 'Using fallback no-image.' : 'Products will have no images.'}`,
    )
  }

  payload.logger.info(
    `Generating ${count} products${enableImageGeneration && PEXELS_API_KEY ? ' with images from Pexels' : fallbackImageId ? ' with fallback images' : ''}...`,
  )

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

    // Generate inventory with realistic distribution
    const inventory = generateInventory()

    // Select single category for this product
    const category = faker.helpers.arrayElement(categories)

    // Generate product name based on category
    const { title, productType } = generateProductName(category)

    // Generate image if enabled
    let galleryImages: number[] = []
    if (enableImageGeneration) {
      if (PEXELS_API_KEY) {
        // Try to get image from Pexels
        const imageId = await generateImageForProduct(
          payload,
          category.title || 'product',
          productType, // Use product type instead of full title for better image results
        )
        if (imageId) {
          galleryImages = [imageId]
        } else if (fallbackImageId) {
          // Pexels failed, use fallback
          galleryImages = [fallbackImageId]
        }
      } else if (fallbackImageId) {
        // No Pexels API key, use fallback
        galleryImages = [fallbackImageId]
      }
    }

    // Generate realistic product description mentioning the product type
    const description = `${faker.commerce.productDescription()} This ${productType.toLowerCase()} is perfect for ${category.title?.toLowerCase() || 'everyday use'}.`

    // Determine which variant types this product should have
    const productVariantTypes = getVariantTypesForProduct(productType)
    const productVariantTypeIds: number[] = []
    const [sizeVariantType, colorVariantType] = variantTypes

    if (productVariantTypes.includes('size')) {
      productVariantTypeIds.push(sizeVariantType.id)
    }
    if (productVariantTypes.includes('color')) {
      productVariantTypeIds.push(colorVariantType.id)
    }

    // Generate realistic product data
    // Add random suffix to ensure slug uniqueness
    const slugBase = faker.helpers.slugify(title).toLowerCase()
    const slugSuffix = faker.string.alphanumeric(6)
    const slug = `${slugBase}-${slugSuffix}`

    const productData = {
      title,
      slug,
      priceInUSD,
      priceInUSDEnabled: true,
      inventory,
      enableVariants: productVariantTypeIds.length > 0,
      variantTypes: productVariantTypeIds,
      categories: [category.id],
      gallery: galleryImages.map((imageId) => ({ image: imageId })),
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
                  text: description,
                  version: 1,
                },
              ],
              version: 1,
            },
          ],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      },
    }

    const product = await payload.create({
      collection: 'products',
      data: productData,
      depth: 0,
    })

    // Create variants based on product type
    if (sizeVariantOptions && colorVariantOptions && productVariantTypeIds.length > 0) {
      const variantTypesToCreate = productVariantTypes

      if (variantTypesToCreate.length > 0) {
        // Generate all possible combinations first
        const allCombinations: Array<{
          options: number[]
          labels: string[]
        }> = []

        const hasSizeVariants = variantTypesToCreate.includes('size')
        const hasColorVariants = variantTypesToCreate.includes('color')

        if (hasSizeVariants && hasColorVariants) {
          // Both size and color: create all combinations
          for (const sizeOpt of sizeVariantOptions) {
            for (const colorOpt of colorVariantOptions) {
              allCombinations.push({
                options: [sizeOpt.id, colorOpt.id],
                labels: [sizeOpt.label || '', colorOpt.label || ''],
              })
            }
          }
        } else if (hasSizeVariants) {
          // Size only
          for (const sizeOpt of sizeVariantOptions) {
            allCombinations.push({
              options: [sizeOpt.id],
              labels: [sizeOpt.label || ''],
            })
          }
        } else if (hasColorVariants) {
          // Color only
          for (const colorOpt of colorVariantOptions) {
            allCombinations.push({
              options: [colorOpt.id],
              labels: [colorOpt.label || ''],
            })
          }
        }

        // Shuffle and select 2-4 unique variants
        const numVariants = Math.min(
          faker.number.int({ min: 2, max: 4 }),
          allCombinations.length,
        )
        const selectedCombinations = faker.helpers.arrayElements(allCombinations, numVariants)

        // Create each unique variant
        for (const combination of selectedCombinations) {
          const variantTitle = combination.labels.filter(Boolean).join(' / ')

          // Create variant with slight price variation
          const priceVariation = faker.number.int({ min: -500, max: 1000 })
          const variantPrice = priceInUSD + priceVariation

          await payload.create({
            collection: 'variants',
            data: {
              title: variantTitle,
              product: product.id,
              options: combination.options,
              inventory: faker.number.int({ min: 10, max: 100 }),
              priceInUSDEnabled: true,
              priceInUSD: Math.max(variantPrice, 1000), // Minimum $10
              _status: 'published',
            },
            depth: 0,
          })
        }
      }
    }

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
