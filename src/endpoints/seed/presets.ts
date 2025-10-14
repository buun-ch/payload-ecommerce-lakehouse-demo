/**
 * Data volume presets for seed generation
 *
 * Controls the number of records generated for each collection.
 * Can be set via SEED_PRESET environment variable or passed directly.
 */

export type SeedPreset = 'small' | 'medium' | 'large'

export interface PresetConfig {
  description: string
  useCase: string
  volumes: {
    categories: number
    products: number
    users: number
    orders: number
    carts: number
    addresses: number
  }
}

export const PRESETS: Record<SeedPreset, PresetConfig> = {
  small: {
    description: 'Quick testing and local development',
    useCase: 'Fast iteration, debugging, unit tests',
    volumes: {
      categories: 8,
      products: 50,
      users: 100,
      orders: 500,
      carts: 150,
      addresses: 300,
    },
  },

  medium: {
    description: 'Full demo and workshops',
    useCase: 'Analytics demos, presentations, workshops',
    volumes: {
      categories: 15,
      products: 200,
      users: 500,
      orders: 3000,
      carts: 800,
      addresses: 1500,
    },
  },

  large: {
    description: 'Performance testing and realistic scale',
    useCase: 'Load testing, production-like scenarios',
    volumes: {
      categories: 25,
      products: 1000,
      users: 2000,
      orders: 20000,
      carts: 5000,
      addresses: 6000,
    },
  },
}

/**
 * Get preset configuration from environment variable or default
 */
export function getPreset(): PresetConfig {
  const presetName = (process.env.SEED_PRESET || 'medium') as SeedPreset

  if (!PRESETS[presetName]) {
    throw new Error(
      `Invalid SEED_PRESET: ${presetName}. Must be one of: ${Object.keys(PRESETS).join(', ')}`,
    )
  }

  return PRESETS[presetName]
}

/**
 * Get preset by name
 */
export function getPresetByName(name: SeedPreset): PresetConfig {
  if (!PRESETS[name]) {
    throw new Error(`Invalid preset name: ${name}. Must be one of: ${Object.keys(PRESETS).join(', ')}`)
  }

  return PRESETS[name]
}
