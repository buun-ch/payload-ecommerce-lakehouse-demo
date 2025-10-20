/**
 * Probability distributions for realistic data generation
 *
 * These configurations model real-world ecommerce patterns:
 * - Pareto distribution (80/20 rule) for product popularity
 * - Customer segmentation (VIP, Regular, New)
 * - Realistic cart abandonment rates
 * - Seasonal ordering patterns
 */

import { faker } from '@faker-js/faker'

/**
 * Customer segment types
 */
export type CustomerSegment = 'VIP' | 'Regular' | 'New'

/**
 * Product popularity tiers (for Pareto distribution)
 */
export type ProductPopularity = 'high' | 'medium' | 'low'

/**
 * Price tiers (log-normal distribution)
 */
export type PriceTier = 'budget' | 'premium' | 'luxury'

/**
 * Customer segmentation distribution
 * VIP: 5% - High value customers (10-20 orders, $500-$2000 AOV)
 * Regular: 25% - Returning customers (3-8 orders, $100-$500 AOV)
 * New: 70% - First-time buyers (1-2 orders, $20-$100 AOV)
 */
export const CUSTOMER_SEGMENTS = [
  { weight: 5, value: 'VIP' as CustomerSegment },
  { weight: 25, value: 'Regular' as CustomerSegment },
  { weight: 70, value: 'New' as CustomerSegment },
]

/**
 * Product popularity distribution (Pareto: 80/20 rule)
 * Top 20% of products generate 80% of revenue
 */
export const PRODUCT_POPULARITY = [
  { weight: 20, value: 'high' as ProductPopularity },
  { weight: 30, value: 'medium' as ProductPopularity },
  { weight: 50, value: 'low' as ProductPopularity },
]

/**
 * Product selection weights for orders (implements Pareto distribution)
 * High popularity products are selected 80% of the time
 */
export const ORDER_PRODUCT_SELECTION = [
  { weight: 80, value: 'high' as ProductPopularity },
  { weight: 15, value: 'medium' as ProductPopularity },
  { weight: 5, value: 'low' as ProductPopularity },
]

/**
 * Price tier distribution (log-normal approximation)
 * Most products are budget, fewer are luxury
 */
export const PRICE_TIERS = [
  { weight: 70, value: 'budget' as PriceTier },
  { weight: 25, value: 'premium' as PriceTier },
  { weight: 5, value: 'luxury' as PriceTier },
]

/**
 * Price ranges by tier (in cents)
 */
export const PRICE_RANGES: Record<PriceTier, { min: number; max: number }> = {
  budget: { min: 2000, max: 10000 }, // $20 - $100
  premium: { min: 10000, max: 50000 }, // $100 - $500
  luxury: { min: 50000, max: 200000 }, // $500 - $2000
}

/**
 * Order amount ranges by customer segment (in cents)
 */
export const ORDER_AMOUNTS: Record<CustomerSegment, { min: number; max: number }> = {
  VIP: { min: 50000, max: 200000 }, // $500 - $2000
  Regular: { min: 10000, max: 50000 }, // $100 - $500
  New: { min: 2000, max: 10000 }, // $20 - $100
}

/**
 * Order frequency by customer segment
 */
export const ORDER_COUNTS: Record<CustomerSegment, { min: number; max: number }> = {
  VIP: { min: 10, max: 20 },
  Regular: { min: 3, max: 8 },
  New: { min: 1, max: 2 },
}

/**
 * Cart abandonment rate (industry average: 28%)
 */
export const CART_ABANDONMENT_RATE = 0.28

/**
 * Inventory level types
 */
export type InventoryLevel = 'out_of_stock' | 'low_stock' | 'limited_stock' | 'normal_stock' | 'high_stock'

/**
 * Inventory status distribution with realistic levels
 * - Out of stock (0): 10% - Products sold out
 * - Low stock (1-10): 10% - Urgent reorder needed
 * - Limited stock (11-50): 20% - Moderate availability
 * - Normal stock (51-200): 40% - Healthy inventory
 * - High stock (201-500): 20% - Overstocked or popular items
 */
export const INVENTORY_DISTRIBUTION = [
  { weight: 10, value: 'out_of_stock' as InventoryLevel },
  { weight: 10, value: 'low_stock' as InventoryLevel },
  { weight: 20, value: 'limited_stock' as InventoryLevel },
  { weight: 40, value: 'normal_stock' as InventoryLevel },
  { weight: 20, value: 'high_stock' as InventoryLevel },
]

/**
 * Inventory quantity ranges by level
 */
export const INVENTORY_RANGES: Record<InventoryLevel, { min: number; max: number }> = {
  out_of_stock: { min: 0, max: 0 },
  low_stock: { min: 1, max: 10 },
  limited_stock: { min: 11, max: 50 },
  normal_stock: { min: 51, max: 200 },
  high_stock: { min: 201, max: 500 },
}

/**
 * Products with variants enabled (40% have variants)
 */
export const VARIANTS_ENABLED_RATE = 0.4

/**
 * Order status distribution
 */
export const ORDER_STATUS = [
  { weight: 70, value: 'completed' },
  { weight: 20, value: 'processing' },
  { weight: 8, value: 'cancelled' },
  { weight: 2, value: 'refunded' },
]

/**
 * Transaction status distribution
 */
export const TRANSACTION_STATUS = [
  { weight: 92, value: 'succeeded' },
  { weight: 5, value: 'pending' },
  { weight: 3, value: 'failed' },
]

/**
 * Category popularity distribution (realistic ecommerce)
 */
export const CATEGORY_POPULARITY = [
  { weight: 35, value: 'Electronics' },
  { weight: 30, value: 'Fashion' },
  { weight: 20, value: 'Home & Garden' },
  { weight: 15, value: 'Sports & Outdoors' },
]

/**
 * Product types per category for realistic product generation
 * Categories with direct Faker methods use simplified types
 */
export const CATEGORY_PRODUCT_TYPES: Record<string, string[]> = {
  // Direct Faker methods - simplified types
  Books: ['Book'], // faker.book.title() generates full title
  Food: ['Food'], // faker.food.dish() generates full dish name
  Music: ['Album', 'Instrument'], // faker.music.songName() or instrument names

  // Standard categories
  Electronics: [
    'Laptop',
    'Phone',
    'Tablet',
    'Keyboard',
    'Mouse',
    'Monitor',
    'Camera',
    'Headphones',
    'Speaker',
    'Charger',
    'Cable',
    'Router',
    'Webcam',
    'Microphone',
    'Smartwatch',
  ],
  Fashion: [
    'Shirt',
    'Pants',
    'Dress',
    'Jacket',
    'Shoes',
    'Boots',
    'Sneakers',
    'Hat',
    'Cap',
    'Scarf',
    'Belt',
    'Gloves',
    'Socks',
    'Sweater',
    'Coat',
  ],
  'Home & Garden': [
    'Chair',
    'Table',
    'Lamp',
    'Sofa',
    'Bed',
    'Pillow',
    'Blanket',
    'Rug',
    'Curtain',
    'Vase',
    'Mirror',
    'Clock',
    'Plant Pot',
    'Basket',
    'Shelf',
  ],
  'Sports & Outdoors': [
    'Bike',
    'Ball',
    'Racket',
    'Weights',
    'Tent',
    'Backpack',
    'Helmet',
    'Running Shoes',
    'Yoga Mat',
    'Water Bottle',
    'Climbing Rope',
    'Sleeping Bag',
    'Fishing Rod',
    'Skateboard',
    'Goggles',
  ],
  Automotive: [
    'Tires',
    'Oil Filter',
    'Battery',
    'Brake Pads',
    'Wipers',
    'Air Filter',
    'Spark Plugs',
    'Car Seat Cover',
    'Floor Mat',
    'Phone Mount',
    'Dash Cam',
    'Jump Starter',
    'Tool Kit',
    'Car Vacuum',
    'Car Wax',
  ],
  Books: [
    'Novel',
    'Textbook',
    'Cookbook',
    'Biography',
    'Comic Book',
    'Magazine',
    'Dictionary',
    'Atlas',
    'Journal',
    'Notebook',
  ],
  'Toys & Games': [
    'Board Game',
    'Puzzle',
    'Action Figure',
    'Doll',
    'Building Blocks',
    'Remote Control Car',
    'Stuffed Animal',
    'Card Game',
    'Video Game',
    'Toy Train',
  ],
  'Beauty & Personal Care': [
    'Shampoo',
    'Conditioner',
    'Face Cream',
    'Lipstick',
    'Mascara',
    'Perfume',
    'Soap',
    'Toothbrush',
    'Hair Dryer',
    'Makeup Brush',
  ],
  Food: [
    'Dish',
    'Ingredient',
    'Beverage',
    'Dessert',
    'Snack',
  ],
  'Food & Grocery': [
    'Coffee',
    'Tea',
    'Pasta',
    'Rice',
    'Olive Oil',
    'Spices',
    'Cereal',
    'Snack Bar',
    'Chocolate',
    'Cookies',
  ],
  'Pet Supplies': [
    'Pet Food',
    'Pet Bed',
    'Leash',
    'Collar',
    'Pet Toy',
    'Litter Box',
    'Pet Carrier',
    'Food Bowl',
    'Pet Shampoo',
    'Pet Treats',
  ],
  'Office Products': [
    'Desk',
    'Office Chair',
    'Stapler',
    'Pen',
    'Notebook',
    'Folder',
    'Calculator',
    'Desk Lamp',
    'Paper Shredder',
    'Whiteboard',
  ],
  'Baby Products': [
    'Diapers',
    'Baby Bottle',
    'Pacifier',
    'Baby Monitor',
    'Stroller',
    'Car Seat',
    'Baby Carrier',
    'Crib',
    'High Chair',
    'Baby Clothes',
  ],
  'Health & Wellness': [
    'Vitamins',
    'Protein Powder',
    'First Aid Kit',
    'Thermometer',
    'Blood Pressure Monitor',
    'Massage Gun',
    'Heating Pad',
    'Resistance Bands',
    'Foam Roller',
    'Essential Oils',
  ],
  Music: [
    'Guitar',
    'Piano',
    'Drums',
    'Violin',
    'Ukulele',
    'Keyboard',
    'Microphone',
    'Saxophone',
    'Trumpet',
    'Flute',
  ],
  'Musical Instruments': [
    'Guitar',
    'Piano',
    'Drums',
    'Violin',
    'Ukulele',
    'Keyboard',
    'Microphone',
    'Guitar Strings',
    'Music Stand',
    'Metronome',
  ],
  'Garden & Outdoor': [
    'Garden Hose',
    'Lawn Mower',
    'Garden Tools',
    'Plant Seeds',
    'Fertilizer',
    'Watering Can',
    'Garden Gloves',
    'Pruning Shears',
    'Planter Box',
    'Garden Bench',
  ],
  'Arts & Crafts': [
    'Paint Set',
    'Brush Set',
    'Canvas',
    'Colored Pencils',
    'Markers',
    'Clay',
    'Glue Gun',
    'Scissors',
    'Craft Paper',
    'Knitting Needles',
  ],
  'Industrial & Scientific': [
    'Safety Goggles',
    'Lab Coat',
    'Test Tubes',
    'Microscope',
    'Measuring Tools',
    'Safety Gloves',
    'Chemicals',
    'Beakers',
    'Pipettes',
    'Scale',
  ],
  Handmade: [
    'Handmade Soap',
    'Handmade Candle',
    'Handmade Jewelry',
    'Handmade Pottery',
    'Handmade Bag',
    'Handmade Scarf',
    'Handmade Card',
    'Handmade Ornament',
    'Handmade Quilt',
    'Handmade Basket',
  ],
  Jewelry: [
    'Necklace',
    'Bracelet',
    'Ring',
    'Earrings',
    'Pendant',
    'Brooch',
    'Anklet',
    'Cufflinks',
    'Jewelry Box',
    'Watch',
  ],
  Watches: [
    'Wristwatch',
    'Smartwatch',
    'Pocket Watch',
    'Sports Watch',
    'Diving Watch',
    'Chronograph',
    'Watch Band',
    'Watch Case',
    'Watch Winder',
    'Watch Tool Kit',
  ],
  Luggage: [
    'Suitcase',
    'Backpack',
    'Duffel Bag',
    'Carry-On',
    'Travel Pillow',
    'Packing Cubes',
    'Luggage Tags',
    'Travel Adapter',
    'Toiletry Bag',
    'Luggage Scale',
  ],
  Shoes: [
    'Running Shoes',
    'Sneakers',
    'Boots',
    'Sandals',
    'Dress Shoes',
    'Slippers',
    'High Heels',
    'Loafers',
    'Athletic Shoes',
    'Hiking Boots',
  ],
  Tools: [
    'Hammer',
    'Screwdriver',
    'Drill',
    'Saw',
    'Wrench',
    'Pliers',
    'Tape Measure',
    'Level',
    'Utility Knife',
    'Tool Box',
  ],
  'Video Games': [
    'Console',
    'Controller',
    'Game Disc',
    'VR Headset',
    'Gaming Chair',
    'Headset',
    'Mouse Pad',
    'Game Card',
    'Charging Station',
    'Memory Card',
  ],
  Software: [
    'Operating System',
    'Office Suite',
    'Antivirus',
    'Photo Editor',
    'Video Editor',
    'Design Software',
    'Backup Software',
    'VPN',
    'Password Manager',
    'Development Tools',
  ],
}

/**
 * Materials for product name generation
 */
export const PRODUCT_MATERIALS = [
  'Cotton',
  'Leather',
  'Metal',
  'Plastic',
  'Wooden',
  'Rubber',
  'Steel',
  'Aluminum',
  'Ceramic',
  'Glass',
  'Silicone',
  'Canvas',
  'Nylon',
  'Polyester',
  'Bamboo',
]

/**
 * Brand names for categories that don't have Faker methods
 */
export const TECH_BRANDS = [
  'TechPro',
  'SmartView',
  'UltraSound',
  'PowerMax',
  'DigiCore',
  'CoreTech',
  'NexGen',
  'ProLine',
  'Elite',
  'Prime',
]

export const TECH_ADJECTIVES = [
  'Wireless',
  'Ultra',
  'Pro',
  'Smart',
  '4K',
  'HD',
  'Premium',
  'Advanced',
  'Digital',
  'High-Performance',
]

export const FASHION_STYLES = [
  'Slim Fit',
  'Classic',
  'Vintage',
  'Modern',
  'Casual',
  'Elegant',
  'Comfortable',
  'Stylish',
  'Premium',
  'Designer',
]

export const FASHION_MATERIALS = [
  'Cotton',
  'Denim',
  'Leather',
  'Wool',
  'Silk',
  'Linen',
  'Cashmere',
  'Polyester',
  'Nylon',
  'Canvas',
]

/**
 * Product types that have size variants
 */
export const SIZE_VARIANT_PRODUCTS = [
  'Shirt',
  'Pants',
  'Dress',
  'Jacket',
  'Shoes',
  'Boots',
  'Sneakers',
  'Hat',
  'Cap',
  'Gloves',
  'Socks',
  'Sweater',
  'Coat',
  'Running Shoes',
  'Athletic Shoes',
  'Hiking Boots',
  'Sandals',
  'Dress Shoes',
  'Slippers',
  'High Heels',
  'Loafers',
]

/**
 * Product types that have color variants
 */
export const COLOR_VARIANT_PRODUCTS = [
  'Ball',
  'Table',
  'Chair',
  'Sofa',
  'Car',
  'Bike',
  'Phone',
  'Laptop',
  'Tablet',
  'Backpack',
  'Suitcase',
  'Towel',
  'Rug',
  'Curtain',
  'Pillow',
  'Blanket',
  'Helmet',
  'Yoga Mat',
]

/**
 * Determine which variant types a product should have
 */
export function getVariantTypesForProduct(productType: string): ('size' | 'color')[] {
  const variants: ('size' | 'color')[] = []

  if (SIZE_VARIANT_PRODUCTS.includes(productType)) {
    variants.push('size')
  }

  if (COLOR_VARIANT_PRODUCTS.includes(productType)) {
    variants.push('color')
  }

  return variants
}

/**
 * Generate weighted random element
 * Wrapper around faker.helpers.weightedArrayElement with type safety
 */
export function weightedChoice<T>(choices: Array<{ weight: number; value: T }>): T {
  return faker.helpers.weightedArrayElement(choices)
}

/**
 * Generate price based on tier
 */
export function generatePrice(tier?: PriceTier): number {
  const selectedTier = tier || weightedChoice(PRICE_TIERS)
  const range = PRICE_RANGES[selectedTier]
  return faker.number.int(range)
}

/**
 * Generate order amount based on customer segment
 */
export function generateOrderAmount(segment: CustomerSegment): number {
  const range = ORDER_AMOUNTS[segment]
  return faker.number.int(range)
}

/**
 * Generate inventory quantity based on distribution
 */
export function generateInventory(): number {
  const level = weightedChoice(INVENTORY_DISTRIBUTION)
  const range = INVENTORY_RANGES[level]

  if (range.min === range.max) {
    return range.min
  }

  return faker.number.int(range)
}

/**
 * Check if cart should be abandoned
 */
export function isCartAbandoned(): boolean {
  return Math.random() < CART_ABANDONMENT_RATE
}

/**
 * Check if date is in seasonal spike period
 * Black Friday: Nov 25-30 (3x multiplier)
 * Holiday season: Dec 15-31 (2x multiplier)
 */
export function getSeasonalMultiplier(date: Date): number {
  const month = date.getMonth()
  const day = date.getDate()

  // Black Friday week (late November)
  if (month === 10 && day >= 25) {
    return 3.0
  }

  // Holiday shopping (mid-late December)
  if (month === 11 && day >= 15) {
    return 2.0
  }

  return 1.0
}

/**
 * Check if date is weekend (40% boost)
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

/**
 * Get overall volume multiplier based on date
 * Combines seasonal and day-of-week patterns
 */
export function getVolumeMultiplier(date: Date): number {
  let multiplier = getSeasonalMultiplier(date)

  if (isWeekend(date)) {
    multiplier *= 1.4
  }

  return multiplier
}

/**
 * Generate random date with realistic distribution
 * More recent dates are more likely
 */
export function generateRecentDate(from: Date, to: Date): Date {
  // Use power distribution to bias towards recent dates
  // Power of 2 gives moderate bias, higher powers give stronger bias
  const fromTime = from.getTime()
  const toTime = to.getTime()
  const range = toTime - fromTime

  // Generate random number with power distribution
  // uniform^2 biases toward 0, so (1 - uniform^2) biases toward 1 (recent)
  const uniform = Math.random()
  const normalized = 1 - uniform * uniform  // Square gives moderate recent bias

  const timestamp = fromTime + range * normalized

  return new Date(timestamp)
}

/**
 * Generate random date with weekend bias
 * Weekends are 1.4x more likely to be selected (40% boost)
 *
 * This implements rejection sampling to achieve the desired weekend/weekday ratio:
 * - Normal distribution: 5 weekdays, 2 weekend days (28.6% weekend)
 * - With 1.4x boost: 35.9% weekend, 64.1% weekday
 */
export function generateRecentDateWithWeekendBias(from: Date, to: Date, weekendMultiplier: number = 1.4): Date {
  // Maximum attempts to avoid infinite loops
  const maxAttempts = 20

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const date = generateRecentDate(from, to)

    // Weekend dates are always accepted
    if (isWeekend(date)) {
      return date
    }

    // Weekday dates are accepted with reduced probability to achieve the weekend boost
    // Calculation: 5 weekdays / (5 weekdays + 2 weekend days * (multiplier - 1))
    // For multiplier=1.4: 5 / (5 + 2*0.4) = 5 / 5.8 = 0.862
    const weekdayAcceptanceProbability = 5 / (5 + 2 * (weekendMultiplier - 1))

    if (Math.random() < weekdayAcceptanceProbability) {
      return date
    }
    // Rejected, try again
  }

  // Fallback: return last generated date if max attempts reached
  return generateRecentDate(from, to)
}
