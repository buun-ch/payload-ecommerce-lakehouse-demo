# Payload Ecommerce Lakehouse Demo

A demonstration of integrating a Next.js ecommerce application with an open-source lakehouse architecture for analytics and business intelligence.

## Overview

This project showcases how to build a modern data stack by combining:

- **Next.js Application**: Full-featured ecommerce site built with Payload CMS
- **Data Extraction**: Automated data ingestion with dlt (data load tool)
- **Data Transformation**: Analytics-ready models with dbt (data build tool)
- **Lakehouse Storage**: Apache Iceberg tables via Lakekeeper REST Catalog
- **Query Engine**: Trino for distributed SQL queries
- **BI & Visualization**: Apache Superset for dashboards and reporting

## Architecture

```plain
┌─────────────────────┐
│   Next.js + Payload │ Ecommerce Application
│   (PostgreSQL)      │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │     dlt      │ Data Ingestion
    │  (Python)    │
    └──────┬───────┘
           │
           ▼
┌──────────────────────┐
│  Iceberg REST Catalog│ Lakehouse Storage
│   (Lakekeeper)       │
│   ↓                  │
│ S3/MinIO (Parquet)   │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────┐
    │     dbt      │ Data Transformation
    │   + Trino    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │   Superset   │ Analytics & BI
    └──────────────┘
```

## Features

### 🛒 Ecommerce Application

Built with [Payload CMS ecommerce template](./README-payload.md):

- Product catalog with variants and categories
- Shopping cart and checkout flow
- Order management
- Customer accounts
- Stripe payment integration
- Admin panel for content management

### 📊 Analytics Pipeline

**Data Ingestion (dlt)**:

- Incremental data extraction from Payload CMS API
- Change Data Capture (CDC) via `updated_since` parameter
- Direct writes to Iceberg tables
- Schema evolution support

**Data Transformation (dbt)**:

- Star schema design (fact & dimension tables)
- JSON parsing with Trino native functions
- Incremental models for efficient updates
- Data quality tests
- See: [data/transformation/README.md](./data/transformation/README.md)

**Analytics & BI**:

- Pre-built SQL queries for common analyses
- Customer segmentation (RFM analysis)
- Product performance tracking
- Cohort retention analysis
- Apache Superset dashboards with advanced visualizations
  - Heatmaps for cohort retention analysis
  - Bubble charts for RFM segmentation
  - Mixed charts (bar + line) for multi-metric insights
  - Conditional formatting for operational alerts
- See: [docs/analysis_queries.md](./docs/analysis_queries.md)

## Getting Started

### Prerequisites

- [mise](https://mise.jdx.dev/) - Development tool version manager

**Note**: Node.js, Python, pnpm, and just are managed by mise and will be installed automatically.

### Quick Start

1. **Clone and setup the application:**

   ```bash
   git clone <repository-url>
   cd payload-ecommerce-lakehouse-demo

   # Trust mise configuration to install development tools
   mise trust
   mise install

   # View available tasks
   just

   # Install dependencies
   pnpm install

   # Setup environment
   cp .env.example .env
   # Edit .env with your configuration

   # Start the app
   pnpm dev
   ```

   **Note**: This project uses [just](https://github.com/casey/just) as a command runner. Run `just` without arguments to see all available recipes.

   See [README-payload.md](./README-payload.md) for detailed application setup.

2. **Seed demo data:**

   ```bash
   # Set Pexels API key for product images (optional, for image generation)
   export PEXELS_API_KEY="..."

   # Generate sample ecommerce data with default preset (medium)
   just payload::op-seed

   # Or specify a preset: small, medium, or large
   just payload::op-seed small
   just payload::op-seed medium
   just payload::op-seed large
   ```

   **Data Volume by Preset:**

   | Preset | Products | Users | Orders | Carts | Use Case |
   | :-- | --: | --: | --: | --: | :-- |
   | small | 50 | 100 | 500 | 150 | Quick testing, local development |
   | medium | 200 | 500 | 3,000 | 800 | Analytics demos, workshops (default) |
   | large | 1,000 | 2,000 | 20,000 | 5,000 | Performance testing, realistic scale |

   See [docs/seed.md](./docs/seed.md) for detailed seeding options and data distributions.

3. **Ingest data to lakehouse:**

   ```bash
   cd data/ingestion

   # Setup environment
   cp env.local.example .env.local
   # Edit .env.local with your configuration

   # Install dependencies
   pip install -r requirements.txt

   # Run ingestion
   just dlt::op-run
   ```

4. **Transform data with dbt:**

   ```bash
   cd data/transformation

   # Setup environment
   cp env.local.example .env.local
   # Edit .env.local with your configuration

   # Install dependencies
   pip install -r requirements.txt

   # Setup dbt profile
   mkdir -p ~/.dbt
   cp profiles.yml ~/.dbt/profiles.yml

   # Run transformations
   just dbt::op-run --target=prod
   ```

5. **Query with Trino:**

   ```bash
   # Install Trino CLI (macOS)
   brew install trino

   # Connect to Trino (interactive shell)
   just trino

   # Or specify username
   just trino buun
   ```

   Quick verification queries:

   ```sql
   -- Verify all layers exist
   SHOW SCHEMAS IN iceberg;

   -- Count records in each layer
   SELECT COUNT(*) FROM iceberg.ecommerce.orders;           -- Raw
   SELECT COUNT(*) FROM iceberg.ecommerce_staging.stg_orders;  -- Staging
   SELECT COUNT(*) FROM iceberg.ecommerce_marts.fact_orders;   -- Marts

   -- Monthly revenue summary
   SELECT
     DATE_TRUNC('month', order_date) AS month,
     COUNT(DISTINCT order_id) AS total_orders,
     ROUND(SUM(amount_usd), 2) AS total_revenue_usd
   FROM iceberg.ecommerce_marts.fact_orders
   GROUP BY DATE_TRUNC('month', order_date)
   ORDER BY month DESC;
   ```

   More sample queries in [docs/analysis_queries.md](./docs/analysis_queries.md)

## Project Structure

```plain
.
├── src/                          # Next.js application source
│   ├── app/                      # App router pages
│   ├── collections/              # Payload CMS collections
│   ├── components/               # React components
│   └── plugins/                  # Payload plugins (ecommerce, SEO, etc)
├── data/
│   ├── ingestion/                # dlt pipeline for data extraction
│   └── transformation/           # dbt models for analytics
├── docs/                         # Documentation
│   ├── analysis_queries.md       # Sample SQL queries for analytics
│   └── seed.md                   # Data seeding guide
├── public/                       # Static assets
├── tests/                        # Integration & E2E tests
└── README-payload.md             # Original Payload CMS documentation
```

## buun-stack Integration

This project is designed to work optimally with [buun-stack](https://github.com/buun-ch/buun-stack), which provides:

- **Kubernetes cluster** with Telepresence for local development
- **Lakekeeper** (Iceberg REST Catalog)
- **Trino** distributed query engine
- **MinIO** S3-compatible object storage
- **Apache Superset** for BI and visualization
- **Managed infrastructure** for the entire data stack

## Development Workflow

### Typical Development Cycle

1. **Develop features** in the Next.js app
2. **Seed data** to test with realistic volumes
3. **Ingest data** to the lakehouse (runs incrementally)
4. **Transform data** with dbt (dev environment)
5. **Query & visualize** in Superset
6. **Deploy to production** (prod target)

### Data Refresh

```bash
# Full refresh (rebuild all data)
just dlt::clear                     # Clear dlt pipeline state
just dlt::op-run                    # Re-ingest all data
just dbt::op-run --target=prod --full-refresh  # Rebuild all models

# Incremental refresh (new/updated records only)
just dlt::op-run                    # Detects changes via updated_since
just dbt::op-run --target=prod      # Incremental models only
```

### Table Management

Drop Iceberg tables when needed (e.g., schema changes, corrupted data):

```bash
# Drop all tables (raw + staging + marts)
just drop-tables

# Drop specific layers
just drop-raw-tables        # Raw tables only (dlt output)
just drop-staging-tables    # Staging views only (dbt staging)
just drop-mart-tables       # Marts tables only (dbt marts)
```

After dropping tables, re-run the pipeline:

```bash
just dlt::clear             # Clear pipeline state
just dlt::op-run            # Re-ingest data
just dbt::op-run --target=prod --full-refresh  # Rebuild models
```

## Technologies

### Application Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **CMS**: Payload CMS 3.0
- **Database**: PostgreSQL

### Data Stack

- **Ingestion**: dlt (data load tool)
- **Storage**: Apache Iceberg (open table format)
- **Catalog**: Lakekeeper (Iceberg REST Catalog)
- **Query**: Trino (distributed SQL engine)
- **Transformation**: dbt (data build tool)
- **BI**: Apache Superset

### Infrastructure

- **Kubernetes**: Container orchestration
- **Telepresence**: Local development with remote services
- **MinIO**: S3-compatible object storage
- **1Password CLI**: Secrets management

### Development Tools

- **mise**: Development tool version manager
- **just**: Command runner for task management

## Documentation

- 📖 [Application Setup](./README-payload.md) - Payload CMS ecommerce template guide
- 🌱 [Data Seeding](./docs/seed.md) - Generate demo data
- 🔄 [Data Ingestion](./data/ingestion/README.md) - dlt pipeline configuration & Payload CMS API reference
- 🔧 [Data Transformation](./data/transformation/README.md) - dbt models and usage
- 📊 [Analytics Queries](./docs/analysis_queries.md) - Sample SQL for common analyses

## Key Concepts

### Lakehouse Architecture

A **lakehouse** combines the best of data lakes and data warehouses:

- **Open formats** (Iceberg, Parquet) - no vendor lock-in
- **ACID transactions** - data consistency
- **Schema evolution** - flexible schema changes
- **Time travel** - query historical data
- **Multiple engines** - query with Trino, DuckDB, Spark, etc.

### Medallion Architecture

Data flows through three layers:

1. **Raw**: Data from Payload CMS API → Iceberg
2. **Staging**: Cleaned & standardized → dbt staging views
3. **Marts**: Analytics-ready star schema → dbt marts tables

### Data Schema

The data pipeline creates tables and views across three Iceberg namespaces:

#### Raw Layer (`iceberg.ecommerce`)

Created by **dlt** from Payload CMS API:

| Table | Description | Source Collection |
|-------|-------------|-------------------|
| `orders` | Order records | `/api/orders` |
| `transactions` | Payment transactions | `/api/transactions` |
| `carts` | Shopping carts | `/api/carts` |
| `products` | Product catalog | `/api/products` |
| `variants` | Product variants | `/api/variants` |
| `categories` | Product categories | `/api/categories` |
| `users` | Customer accounts | `/api/users` |
| `varianttypes` | Variant type definitions | `/api/variantTypes` |
| `variantoptions` | Variant option values | `/api/variantOptions` |

#### Staging Layer (`iceberg.ecommerce_staging`)

Created by **dbt** as views for lightweight transformation:

| View | Description | Materialization |
|------|-------------|-----------------|
| `stg_orders` | Normalized orders | VIEW |
| `stg_order_items` | Exploded order items | VIEW |
| `stg_transactions` | Normalized transactions | VIEW |
| `stg_carts` | Normalized carts | VIEW |
| `stg_products` | Normalized products | VIEW |
| `stg_product_categories` | Product-category relationships | VIEW |
| `stg_variants` | Normalized variants | VIEW |
| `stg_categories` | Normalized categories | VIEW |
| `stg_customers` | Customer master data | VIEW |

#### Marts Layer (`iceberg.ecommerce_marts`)

Created by **dbt** as tables for analytics:

| Table | Type | Description |
|-------|------|-------------|
| `fact_orders` | Fact | Order transactions with metrics |
| `fact_order_items` | Fact | Individual line items |
| `fact_transactions` | Fact | Payment transactions |
| `dim_customers` | Dimension | Customer master with segments |
| `dim_products` | Dimension | Product catalog |
| `dim_categories` | Dimension | Category hierarchy |
| `dim_date` | Dimension | Date dimension for time-based analysis |
| `bridge_product_categories` | Bridge | Many-to-many product-category relationships |

#### Exploring with Trino CLI

Connect to Trino with OIDC authentication:

```bash
# Interactive shell
just trino

# Or specify username directly
just trino buun
```

Useful queries for exploring the schema:

```sql
-- List all schemas in the Iceberg catalog
SHOW SCHEMAS IN iceberg;

-- List tables in raw layer
SHOW TABLES IN iceberg.ecommerce;

-- List views in staging layer
SHOW TABLES IN iceberg.ecommerce_staging;

-- List tables in marts layer
SHOW TABLES IN iceberg.ecommerce_marts;

-- Describe table structure
DESCRIBE iceberg.ecommerce.orders;
DESCRIBE iceberg.ecommerce_marts.fact_orders;

-- Preview data
SELECT * FROM iceberg.ecommerce.orders LIMIT 5;
SELECT * FROM iceberg.ecommerce_staging.stg_orders LIMIT 5;
SELECT * FROM iceberg.ecommerce_marts.fact_orders LIMIT 5;

-- Count records in each layer
SELECT COUNT(*) FROM iceberg.ecommerce.orders;
SELECT COUNT(*) FROM iceberg.ecommerce_marts.fact_orders;

-- Check data freshness
SELECT
  MAX(createdat) as latest_order_raw,
  MAX(updatedat) as latest_update_raw
FROM iceberg.ecommerce.orders;

SELECT
  MAX(order_date) as latest_order_marts
FROM iceberg.ecommerce_marts.fact_orders;
```

See [docs/analysis_queries.md](./docs/analysis_queries.md) for more analytical queries.

### Incremental Processing

- **dlt**: Extracts only new/updated records via `updated_since` parameter
- **dbt**: Incremental models process only changed data
- **Result**: Efficient updates without full table scans

## Contributing

This is a demonstration project. Feel free to:

- Use as a reference for your own lakehouse integrations
- Adapt the dbt models for your needs
- Extend the analytics queries
- Report issues or suggest improvements

## License

See [LICENSE](./LICENSE) for details.

## Resources

- [Payload CMS](https://payloadcms.com/)
- [dlt Documentation](https://dlthub.com/docs)
- [dbt Documentation](https://docs.getdbt.com/)
- [Apache Iceberg](https://iceberg.apache.org/)
- [Trino Documentation](https://trino.io/docs/current/)
- [Apache Superset](https://superset.apache.org/)
- [buun-stack](https://github.com/buun-ch/buun-stack)
- [mise](https://mise.jdx.dev/) - Development tool version manager
- [just](https://github.com/casey/just) - Command runner
