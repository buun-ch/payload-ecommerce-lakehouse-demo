# Payload CMS to Iceberg Data Pipeline

This directory contains dlt pipelines for extracting data from Payload CMS and loading it into Apache Iceberg tables.

## Setup

### 1. Install Dependencies

```bash
mise trust
uv venv
uv sync
```

### 2. Configure Environment Variables

Create `data/ingestion/.env.local`:

```bash
# Iceberg REST Catalog Configuration
ICEBERG_CATALOG_URL="http://localhost:8181/catalog"
ICEBERG_WAREHOUSE="ecommerce"
ICEBERG_NAMESPACE="ecommerce"
ICEBERG_TOKEN=""  # Optional: authentication token for REST Catalog

# Payload CMS Configuration
PAYLOAD_CMS_URL="http://localhost:3000/api"
PAYLOAD_CMS_TOKEN=""  # JWT token from Payload CMS (required for protected collections)

# Pipeline Configuration
WRITE_DISPOSITION="replace"  # "replace" for full refresh (default), "merge" for incremental
# PIPELINE_MODE="debug"      # Uncomment for DuckDB testing

# For incremental loading, set WRITE_DISPOSITION="merge" and optionally configure:
# INITIAL_TIMESTAMP="2024-01-01T00:00:00Z"  # Used only for first run. Default is fine for most cases.
```

#### Using 1Password (op run)

For secure secret management with 1Password CLI (op run), use secret references in `.env.local`:

```bash
# In .env.local, use 1Password references
ICEBERG_TOKEN="op://Personal/lakekeeper token/credential"
PAYLOAD_CMS_TOKEN="op://Personal/Payload ecommerce/credential"
```

Then run with `op run` (automatically used by `just op-run`):

```bash
just op-run  # Runs: op run --env-file=.env.local -- python payload_pipeline.py
```

#### Alternative: Run without 1Password

If you're not using 1Password, use `just run` instead:

```bash
just run  # Runs: source .env.local && python payload_pipeline.py
```

#### Getting a JWT Token Manually

```bash
# From the ecommerce root directory
just get-jwt
# Copy the output token and set it in .env.local
```

**Note:** `.env.local` is gitignored to prevent committing secrets.

## Usage

The pipeline has a single `load()` function that can be configured via environment variables:

### Full Refresh Load (Default)

Replace all data in Iceberg tables:

```bash
# From the ecommerce root directory
just op-run

# Or with explicit configuration
WRITE_DISPOSITION=replace just op-run
```

### Incremental Load

Load only new/updated records since last run:

```bash
WRITE_DISPOSITION=merge just op-run
```

### Debug Mode (DuckDB Testing)

For testing without Iceberg:

```bash
PIPELINE_MODE=debug just op-run
```

## Environment Variables Reference

### Pipeline Configuration

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `PIPELINE_MODE` | `production`, `debug` | `production` | Use `debug` to load to DuckDB for testing |
| `WRITE_DISPOSITION` | `replace`, `merge`, `append`, `skip` | `replace` | Data write strategy (see below) |
| `INITIAL_TIMESTAMP` | ISO 8601 timestamp | `2024-01-01T00:00:00Z` | Starting point for **first** incremental run only. Subsequent runs ignore this and use dlt's saved state. |

### Payload CMS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYLOAD_CMS_URL` | `http://localhost:3000/api` | Base URL of Payload CMS API |
| `PAYLOAD_CMS_TOKEN` | (required) | JWT authentication token for protected collections |

### Iceberg REST Catalog Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ICEBERG_CATALOG_URL` | `http://localhost:8181/catalog` | REST Catalog API endpoint URL |
| `ICEBERG_WAREHOUSE` | `ecommerce` | Warehouse identifier |
| `ICEBERG_NAMESPACE` | `ecommerce` | Namespace (database) for tables |
| `ICEBERG_TOKEN` | (optional) | Authentication token for REST Catalog |
| `BATCH_SIZE` | `1000` | Number of records to process per batch |

### Write Disposition Modes

- **`replace`**: Delete all existing data, then append new data (full refresh)
- **`merge`**: Delete rows matching primary keys, then append new data (upsert)
- **`append`**: Simply append new data without deletion
- **`skip`**: Skip loading if table already exists

### Incremental Loading with `merge` Mode

When using `WRITE_DISPOSITION=merge`, dlt automatically manages incremental loading:

**Initial Run (First Time):**

- Uses `INITIAL_TIMESTAMP` as the starting point (default: `2024-01-01T00:00:00Z`)
- Loads all records where `updatedAt >= INITIAL_TIMESTAMP`
- Automatically saves the last `updatedAt` value to pipeline state

**Subsequent Runs (2nd, 3rd, ... times):**

- `INITIAL_TIMESTAMP` is **ignored** (dlt uses saved state instead)
- Automatically loads only records updated since the last run
- Continues to update the saved `updatedAt` value

**Key Points:**

- ✅ **No manual tracking required** - dlt manages the state automatically
- ✅ **Same command every time** - `just op-run` works for all runs
- ✅ **State persisted** - Stored in `~/.dlt/pipelines/payload_to_iceberg/state/`
- ⚠️ **Reset when needed** - Run `just clear-pipeline` to start fresh from `INITIAL_TIMESTAMP`

**Production Setup Example:**

For daily incremental loads, update `.env.local`:

```bash
WRITE_DISPOSITION="merge"  # Enable incremental mode
# INITIAL_TIMESTAMP="2024-01-01T00:00:00Z"  # Optional: defaults to 2024-01-01
```

Then run the same command every day (or via cron/Airflow):

```bash
just op-run  # Day 1: loads all data since INITIAL_TIMESTAMP
just op-run  # Day 2+: loads only new/updated records
```

**Development/Testing:**

Keep the default for ad-hoc testing:

```bash
WRITE_DISPOSITION="replace"  # Full refresh every time (safe for testing)
```

## Running the Pipeline

### With 1Password (Recommended)

When using 1Password references in `.env.local`:

```bash
# Full refresh (default)
just op-run

# Incremental load
WRITE_DISPOSITION=merge just op-run

# Incremental load with custom start date
WRITE_DISPOSITION=merge INITIAL_TIMESTAMP="2025-01-01T00:00:00Z" just op-run

# Debug with DuckDB
PIPELINE_MODE=debug just op-run
```

### Without 1Password

When using plain values in `.env.local`:

```bash
# Full refresh (default)
just run

# Incremental load
WRITE_DISPOSITION=merge just run

# Incremental load with custom start date
WRITE_DISPOSITION=merge INITIAL_TIMESTAMP="2025-01-01T00:00:00Z" just run

# Debug with DuckDB
PIPELINE_MODE=debug just run
```

### Direct Python Execution

```bash
# Full refresh to Iceberg
python payload_pipeline.py

# Incremental load to Iceberg
WRITE_DISPOSITION=merge python payload_pipeline.py

# Incremental load with custom start date
WRITE_DISPOSITION=merge INITIAL_TIMESTAMP="2025-01-01T00:00:00Z" python payload_pipeline.py

# Debug mode with DuckDB
PIPELINE_MODE=debug python payload_pipeline.py
```

## Payload CMS REST API Reference

### Available Endpoints

The pipeline extracts data from these Payload CMS collections:

**Fact Data Sources:**
- `/api/orders` - Order transactions
- `/api/transactions` - Payment transactions
- `/api/carts` - Shopping cart activities

**Dimension Data Sources:**
- `/api/products` - Product master data
- `/api/variants` - Product variant details
- `/api/categories` - Product categories
- `/api/users` - Customer information
- `/api/variantTypes` - Variant type definitions
- `/api/variantOptions` - Variant option values

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Records per page |
| `page` | integer | 1 | Page number |
| `where` | JSON object | - | Filter conditions |
| `sort` | string | - | Sort field (prefix `-` for DESC) |
| `depth` | integer | 0 | Related data depth (0-10) |
| `select` | string | - | Fields to return (comma-separated) |

**Where Query Operators:**
- `equals`, `not_equals`
- `greater_than`, `greater_than_equal`
- `less_than`, `less_than_equal`
- `like`, `contains`
- `in`, `not_in`, `all`
- `exists`

### API Examples

**Incremental sync (updated since timestamp):**
```bash
curl "http://localhost:3000/api/orders?where[updatedAt][greater_than_equal]=2024-12-10T00:00:00Z&limit=100"
```

**With sorting:**
```bash
curl "http://localhost:3000/api/orders?sort=-createdAt&limit=100"
```

**With related data (depth):**
```bash
curl "http://localhost:3000/api/orders?depth=2&limit=100"
```

**With field selection:**
```bash
curl "http://localhost:3000/api/products?select=id,title,slug,priceInUSD&limit=100"
```

**Response Format:**
```json
{
  "docs": [ /* array of records */ ],
  "totalDocs": 1000,
  "limit": 100,
  "totalPages": 10,
  "page": 1,
  "pagingCounter": 1,
  "hasPrevPage": false,
  "hasNextPage": true,
  "prevPage": null,
  "nextPage": 2
}
```

## Development

### Testing Locally

1. Start Payload CMS:

   ```bash
   cd ../../
   pnpm dev
   ```

2. Run pipeline:

   ```bash
   python payload_pipeline.py
   ```
