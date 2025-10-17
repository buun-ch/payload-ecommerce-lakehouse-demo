# Payload Ecommerce Lakehouse Demo

A demonstration of integrating a Next.js ecommerce application with an open-source lakehouse architecture for analytics and business intelligence.

## Overview

This project showcases how to build a modern data stack by combining:

- **Next.js Application**: Full-featured ecommerce site built with Payload CMS
- **Data Extraction**: Automated data ingestion with dlt (data load tool)
- **Data Transformation**: Analytics-ready models with dbt (data build tool)
- **Lakehouse Storage**: Apache Iceberg tables via Lakekeeper REST Catalog
- **Query Engine**: Trino for distributed SQL queries
- **BI & Visualization**: Metabase for dashboards and reporting

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
    │   Metabase   │ Analytics & BI
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

**Analytics**:

- Pre-built SQL queries for common analyses
- Customer segmentation (RFM analysis)
- Product performance tracking
- Cohort retention analysis
- See: [docs/analysis_queries.md](./docs/analysis_queries.md)

## Getting Started

### Prerequisites

- Docker & Docker Compose (for buun-stack)
- Node.js 18+ (for Next.js app)
- Python 3.11+ (for dlt & dbt)
- pnpm (for package management)
- 1Password CLI (optional, for secrets management)

### Quick Start

1. **Clone and setup the application:**

   ```bash
   git clone <repository-url>
   cd payload-ecommerce-lakehouse-demo

   # Install dependencies
   pnpm install

   # Setup environment
   cp .env.example .env
   # Edit .env with your configuration

   # Start the app
   pnpm dev
   ```

   See [README-payload.md](./README-payload.md) for detailed application setup.

2. **Seed demo data:**

   ```bash
   # Generate sample ecommerce data
   pnpm payload seed large
   ```

   See [docs/seed.md](./docs/seed.md) for seeding options and data volume.

3. **Ingest data to lakehouse:**

   ```bash
   cd data/ingestion

   # Install dependencies
   pip install -r requirements.txt

   # Run ingestion
   just dlt::op-run
   ```

4. **Transform data with dbt:**

   ```bash
   cd data/transformation

   # Install dependencies
   pip install -r requirements.txt

   # Setup dbt profile
   mkdir -p ~/.dbt
   cp profiles.yml ~/.dbt/profiles.yml

   # Run transformations
   just dbt::op-run --target=prod
   ```

5. **Query with Trino/Metabase:**

   Connect to Trino at `https://trino.buun.dev` (via buun-stack)

   Sample queries available in [docs/analysis_queries.md](./docs/analysis_queries.md)

## Project Structure

```plain
.
├── src/                    # Next.js application source
│   ├── app/               # App router pages
│   ├── collections/       # Payload CMS collections
│   ├── components/        # React components
│   └── plugins/           # Payload plugins (ecommerce, SEO, etc)
├── data/
│   ├── ingestion/         # dlt pipeline for data extraction
│   └── transformation/    # dbt models for analytics
├── docs/                  # Documentation
│   ├── analysis_queries.md  # Sample SQL queries for analytics
│   ├── seed.md           # Data seeding guide
│   └── datastack-integration.md  # Lakehouse architecture
├── public/                # Static assets
├── tests/                 # Integration & E2E tests
└── README-payload.md      # Original Payload CMS documentation
```

## buun-stack Integration

This project is designed to work optimally with [buun-stack](https://github.com/buun-ch/buun-stack), which provides:

- **Kubernetes cluster** with Telepresence for local development
- **Lakekeeper** (Iceberg REST Catalog)
- **Trino** distributed query engine
- **MinIO** S3-compatible object storage
- **Metabase** for BI and visualization
- **Managed infrastructure** for the entire data stack

## Development Workflow

### Typical Development Cycle

1. **Develop features** in the Next.js app
2. **Seed data** to test with realistic volumes
3. **Ingest data** to the lakehouse (runs incrementally)
4. **Transform data** with dbt (dev environment)
5. **Query & visualize** in Metabase
6. **Deploy to production** (prod target)

### Data Refresh

```bash
# Full refresh (rebuild all data)
just dlt::op-run --full-refresh
just dbt::op-run --target=prod --full-refresh

# Incremental refresh (new/updated records only)
just dlt::op-run                    # Detects changes via updated_since
just dbt::op-run --target=prod      # Incremental models only
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
- **BI**: Metabase

### Infrastructure

- **Kubernetes**: Container orchestration
- **Telepresence**: Local development with remote services
- **MinIO**: S3-compatible object storage
- **1Password CLI**: Secrets management

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

1. **Bronze** (Raw): Data from Payload CMS API → Iceberg
2. **Silver** (Staging): Cleaned & standardized → dbt staging views
3. **Gold** (Marts): Analytics-ready star schema → dbt marts tables

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
- [buun-stack](https://github.com/buun-ch/buun-stack)
