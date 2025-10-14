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
 * Inventory status distribution
 */
export const INVENTORY_STATUS = [
  { weight: 85, value: 'in_stock' },
  { weight: 15, value: 'out_of_stock' },
]

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
  // Use exponential distribution to bias towards recent dates
  const fromTime = from.getTime()
  const toTime = to.getTime()
  const range = toTime - fromTime

  // Exponential distribution parameter (higher = more recent bias)
  const lambda = 2

  // Generate exponentially distributed random number (0 to 1)
  const uniform = Math.random()
  const exponential = -Math.log(1 - uniform) / lambda

  // Clamp to [0, 1] and apply to date range
  const normalized = Math.min(exponential, 1)
  const timestamp = fromTime + range * normalized

  return new Date(timestamp)
}
