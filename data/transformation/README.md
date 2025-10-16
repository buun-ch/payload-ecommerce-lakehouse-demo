# dbt Transformation - Ecommerce Analytics

This dbt project transforms raw ecommerce data from Iceberg into a star schema optimized for analytics using Trino.

## Quick Start

```bash
# From project root
cd data/transformation

# Install dependencies
pip install -r requirements.txt

# Copy configuration
mkdir -p ~/.dbt
cp profiles.yml ~/.dbt/profiles.yml
cp env.local.example .env.local

# Run transformations (default: dev environment)
just dbt::op-run

# Run with production target
just dbt::op-run --target=prod

# Run tests
just dbt::op-test
```

## Setup

### Prerequisites

- Python 3.11+
- 1Password CLI (optional, for credential management)
- Access to Trino cluster (trino.buun.dev)

### Installation

1. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Configure dbt profile:**

   ```bash
   mkdir -p ~/.dbt
   cp profiles.yml ~/.dbt/profiles.yml
   ```

   The profile uses OAuth2 authentication - no password needed in config files.

3. **Create environment file (optional):**

   ```bash
   cp env.local.example .env.local
   ```

   Edit `.env.local` if you need to override default settings.

## Project Structure

```
models/
├── staging/           # Clean raw data from Iceberg
│   ├── sources.yml    # Source definitions
│   └── stg_*.sql      # Staging views (JSON parsing)
└── marts/            # Star schema for analytics
    ├── schema.yml     # Documentation and tests
    ├── fact_*.sql     # Fact tables
    └── dim_*.sql      # Dimension tables
```

## Key Features

- **Trino + Iceberg**: Query and transform Iceberg tables with Trino
- **JSON Parsing**: Handles nested JSON from dlt extraction (Trino native functions)
- **Star Schema**: Fact and dimension tables for analytics
- **Iceberg Storage**: All models persisted to Iceberg REST Catalog (Lakekeeper)
- **Incremental Updates**: Efficient data refreshes
- **Data Quality Tests**: Built-in validation with dbt tests
- **Dev/Prod Separation**: Isolated schemas for development and production

## Storage Strategy

- **Staging models** (`staging/`): Materialized as **views** in Iceberg
    - `ecommerce_dev.ecommerce_staging` (dev target)
    - `ecommerce.ecommerce_staging` (prod target)
    - Fast iteration during development

- **Mart models** (`marts/`): Materialized as **Iceberg tables** via REST Catalog
    - `ecommerce_dev.ecommerce_marts` (dev target)
    - `ecommerce.ecommerce_marts` (prod target)
    - Persistent storage in object storage (S3/MinIO)
    - Queryable by multiple tools (Trino, DuckDB, Spark)
    - Version control and time travel via Iceberg

Configuration in `dbt_project.yml`:

```yaml
staging:
  +materialized: view
  +schema: staging

marts:
  +materialized: table
  +schema: marts
```

## Dependencies

See [requirements.txt](./requirements.txt):

- **Required**: `dbt-trino` - dbt adapter for Trino
- **Optional**: `sqlfluff` - SQL formatter
- **Optional**: `great-expectations` - Data quality testing

## Usage

### Common Commands

From the project root:

```bash
# Run all models (dev environment)
just dbt::op-run

# Run with production target
just dbt::op-run --target=prod

# Run specific layer
just dbt::op-run --select staging
just dbt::op-run --select marts

# Run specific model
just dbt::op-run --select fact_orders

# Full refresh (rebuild all tables)
just dbt::op-run --full-refresh

# Run tests
just dbt::op-test

# Generate and serve documentation
just dbt::op-docs-generate
just dbt::op-docs-serve
# Visit http://localhost:8080
```

### Targets

- **`dev`** (default): Development workspace using `ecommerce_dev` schema
- **`prod`**: Production workspace using `ecommerce` schema

Both targets write all models to Iceberg via Trino.

## Resources

- [dbt Documentation](https://docs.getdbt.com/)
- [dbt-trino Adapter](https://github.com/starburstdata/dbt-trino)
- [Trino Documentation](https://trino.io/docs/current/)
- [Apache Iceberg](https://iceberg.apache.org/)
- [Lakekeeper (Iceberg REST Catalog)](https://github.com/lakekeeper/lakekeeper)
