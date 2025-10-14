# Enhanced Seed: Realistic Data Generation for Analytics Demos

This directory contains the enhanced seed functionality that generates realistic ecommerce data with proper statistical distributions for analytics demonstrations.

## Features

### Realistic Data Distributions

1. **Pareto Distribution (80/20 Rule)**
   - Top 20% of products generate 80% of sales
   - Implemented through weighted product selection in orders

2. **Customer Segmentation**
   - VIP: 5% - High-value customers ($500-$2000 AOV, 10-20 orders)
   - Regular: 25% - Returning customers ($100-$500 AOV, 3-8 orders)
   - New: 70% - First-time buyers ($20-$100 AOV, 1-2 orders)

3. **Cart Abandonment**
   - 28% abandonment rate (industry average)
   - 70% registered customers, 30% guest carts

4. **Log-Normal Price Distribution**
   - Budget: 70% ($20-$100)
   - Premium: 25% ($100-$500)
   - Luxury: 5% ($500-$2000)

5. **Seasonal Patterns**
   - Black Friday (Nov 25-30): 3x order volume
   - Holiday season (Dec 15-31): 2x order volume
   - Weekend boost: 40% more orders

## Usage

### Clear Existing Data

Before seeding, you can clear all existing seed data:

```bash
# Using pnpm
pnpm clear-seed

# Using just
just clear-seed
```

**⚠️ Warning**: This will delete ALL data from collections (products, orders, users, etc.). You'll have 5 seconds to cancel with Ctrl+C.

### Seed Database

#### Web UI

1. Navigate to PayloadCMS admin panel at `http://localhost:3000/admin`
2. Click "Seed Database" button
3. Set environment variable `SEED_PRESET` before starting:

   ```bash
   SEED_PRESET=medium pnpm dev
   ```

#### Command Line

**Using pnpm scripts:**

```bash
# Medium preset (default) - Recommended for demos
pnpm seed

# Small preset - Quick testing
pnpm seed:small

# Medium preset - Full analytics demo
pnpm seed:medium

# Large preset - Performance testing
pnpm seed:large
```

**Using just:**

```bash
# Medium preset (default)
just seed

# Small preset
just seed small

# Large preset
just seed large
```

**Direct execution:**

```bash
SEED_PRESET=medium tsx scripts/seed.ts
```

**Note**: All seed commands automatically clear existing data before inserting new data.

## Data Volumes

| Preset | Categories | Products | Users | Orders | Carts | Use Case |
|--------|-----------|----------|-------|--------|-------|----------|
| **Small** | 8 | 50 | 100 | 500 | 150 | Quick testing, debugging |
| **Medium** | 15 | 200 | 500 | 3,000 | 800 | Analytics demos, workshops |
| **Large** | 25 | 1,000 | 2,000 | 20,000 | 5,000 | Performance testing, production-like |

## Architecture

### File Structure

```
src/endpoints/seed/
├── enhanced-seed.ts          # Main orchestrator
├── presets.ts                # S/M/L volume configurations
├── distributions.ts          # Probability distributions
└── generators/
    ├── products.ts           # Product generation with Pareto
    ├── customers.ts          # Customer segmentation
    ├── orders.ts             # Orders with biased product selection
    └── carts.ts              # Carts with abandonment modeling
```

### Data Generation Flow

1. **Clear existing data** - Remove all collections and globals
2. **Create base data** - Variant types, options, categories
3. **Generate products** - With popularity tiers (high/medium/low)
4. **Generate customers** - With segments (VIP/Regular/New)
5. **Generate orders** - Select products using Pareto distribution
6. **Generate carts** - 28% abandoned
7. **Update globals** - Header and footer navigation

## Integration with Data Stack

After seeding, test the complete data pipeline:

### 1. Run dlt Pipeline

```bash
# Extract from PayloadCMS to Iceberg
cd data/ingestion
python payload_pipeline.py
```

### 2. Verify Data Quality

Check that distributions match expected values:

```sql
-- Pareto distribution: Top 20% products should have ~80% of sales
WITH product_revenue AS (
    SELECT
        product_id,
        SUM(quantity) as units_sold,
        PERCENT_RANK() OVER (ORDER BY SUM(quantity) DESC) as percentile
    FROM order_items
    GROUP BY product_id
)
SELECT
    CASE
        WHEN percentile <= 0.2 THEN 'Top 20%'
        ELSE 'Bottom 80%'
    END as product_tier,
    SUM(units_sold) as total_units,
    SUM(units_sold) * 100.0 / SUM(SUM(units_sold)) OVER () as percentage
FROM product_revenue
GROUP BY product_tier;
-- Expected: Top 20% ≈ 80%, Bottom 80% ≈ 20%
```

```sql
-- Cart abandonment rate (should be ~28%)
SELECT
    COUNT(*) as total_carts,
    SUM(CASE WHEN purchased_at IS NULL THEN 1 ELSE 0 END) as abandoned,
    AVG(CASE WHEN purchased_at IS NULL THEN 1 ELSE 0 END) * 100 as abandonment_rate
FROM carts;
-- Expected: abandonment_rate ≈ 28%
```

```sql
-- Customer segmentation distribution
SELECT
    segment,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM (
    SELECT
        CASE
            WHEN total_orders >= 10 THEN 'VIP'
            WHEN total_orders >= 3 THEN 'Regular'
            ELSE 'New'
        END as segment
    FROM (
        SELECT customer_id, COUNT(*) as total_orders
        FROM orders
        GROUP BY customer_id
    )
)
GROUP BY segment;
-- Expected: VIP ≈ 5%, Regular ≈ 25%, New ≈ 70%
```

## Analytics Queries Enabled

With realistic distributions, you can demonstrate:

### 1. Top Products Analysis

```sql
SELECT
    p.title,
    COUNT(oi.id) as order_count,
    SUM(oi.quantity) as units_sold,
    SUM(oi.quantity * p.price_in_usd) / 100.0 as revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.title
ORDER BY revenue DESC
LIMIT 10;
```

### 2. Customer Lifetime Value

```sql
SELECT
    c.email,
    COUNT(o.id) as total_orders,
    SUM(o.amount) / 100.0 as lifetime_value,
    CASE
        WHEN COUNT(o.id) >= 10 THEN 'VIP'
        WHEN COUNT(o.id) >= 3 THEN 'Regular'
        ELSE 'New'
    END as segment
FROM users c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.email
ORDER BY lifetime_value DESC;
```

### 3. Conversion Funnel

```sql
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_carts,
    SUM(CASE WHEN purchased_at IS NOT NULL THEN 1 ELSE 0 END) as converted,
    AVG(CASE WHEN purchased_at IS NOT NULL THEN 1 ELSE 0 END) * 100 as conversion_rate
FROM carts
GROUP BY date
ORDER BY date DESC;
```

### 4. Seasonal Trends

```sql
SELECT
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as orders,
    SUM(amount) / 100.0 as revenue
FROM orders
WHERE created_at >= '2024-11-01' AND created_at <= '2024-12-31'
GROUP BY week
ORDER BY week;
-- Should show spikes during Black Friday and Holiday season
```

## Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `SEED_PRESET` | small, medium, large | medium | Data volume preset |
| `SEED_MODE` | enhanced, simple | simple* | Seed mode (set by SEED_PRESET) |

*When `SEED_PRESET` is set, `enhanced` mode is automatically activated.

## Technical Details

### Weighted Random Selection

Uses `@faker-js/faker`'s `weightedArrayElement()` for probability distributions:

```typescript
const segment = faker.helpers.weightedArrayElement([
  { weight: 5, value: 'VIP' },
  { weight: 25, value: 'Regular' },
  { weight: 70, value: 'New' },
])
```

### Product Popularity Tracking

Products are tagged with popularity tiers during generation:

```typescript
const productsByPopularity = {
  high: [],    // Top 20%
  medium: [],  // Next 30%
  low: [],     // Bottom 50%
}
```

Orders then select products using weighted selection:

```typescript
const tier = weightedArrayElement([
  { weight: 80, value: 'high' },    // Top sellers
  { weight: 15, value: 'medium' },
  { weight: 5, value: 'low' },
])
const product = arrayElement(productsByPopularity[tier])
```

### Date Generation with Recency Bias

Uses exponential distribution to bias towards recent dates:

```typescript
function generateRecentDate(from: Date, to: Date): Date {
  const lambda = 2  // Recency bias parameter
  const uniform = Math.random()
  const exponential = -Math.log(1 - uniform) / lambda
  // ... apply to date range
}
```

## Troubleshooting

### Issue: "Module not found" error

**Solution**: Ensure all generator files are created:

```bash
ls src/endpoints/seed/generators/
# Should show: products.ts, customers.ts, orders.ts, carts.ts
```

### Issue: Seed hangs or takes too long

**Solution**: Use smaller preset for testing:

```bash
pnpm seed:small
```

### Issue: Type errors in TypeScript

**Solution**: Regenerate Payload types:

```bash
pnpm generate:types
```

### Issue: Database connection errors

**Solution**: Ensure PostgreSQL is running and DATABASE_URI is set in `.env.local`

## Next Steps

1. **Seed the database**:

   ```bash
   just seed medium
   ```

2. **Extract with dlt**:

   ```bash
   cd data/ingestion
   python payload_pipeline.py
   ```

3. **Verify distributions** using SQL queries above

4. **Build dbt models** to transform into star schema

5. **Create dashboards** in Metabase or similar BI tool

## References

- Faker.js documentation: https://fakerjs.dev/
- Pareto principle: https://en.wikipedia.org/wiki/Pareto_principle
- Cart abandonment statistics: https://baymard.com/lists/cart-abandonment-rate
