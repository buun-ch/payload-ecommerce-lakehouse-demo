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

# Authentication (choose one method):
# Method 1: OAuth2 Client Credentials (recommended for production/Airflow)
OIDC_CLIENT_ID=""        # OAuth2 client ID
OIDC_CLIENT_SECRET=""    # OAuth2 client secret
# Method 2: Static Bearer Token (legacy, tokens expire quickly)
# ICEBERG_TOKEN=""       # Authentication token for REST Catalog

# Payload CMS Configuration
PAYLOAD_CMS_URL="http://localhost:3000/api"
PAYLOAD_CMS_TOKEN=""  # JWT token from Payload CMS (required for protected collections)

# Pipeline Configuration
WRITE_DISPOSITION="merge"  # "merge" for incremental (default), "replace" for full refresh
# PIPELINE_MODE="debug"     # Uncomment for DuckDB testing

# For incremental loading (default):
# INITIAL_TIMESTAMP="2024-01-01T00:00:00Z"  # Used only for first run. Default is fine for most cases.

# WARNING: Do NOT use "replace" mode with paginated sources!
# The REST API streams pages one by one, and "replace" will overwrite data on each page,
# keeping only the last page. Use "merge" instead to collect all pages correctly.
```

#### Using 1Password (op run)

For secure secret management with 1Password CLI (op run), use secret references in `.env.local`:

```bash
# In .env.local, use 1Password references
# OAuth2 Client Credentials (recommended)
OIDC_CLIENT_ID="op://Personal/lakekeeper-service/username"
OIDC_CLIENT_SECRET="op://Personal/lakekeeper-service/credential"

# Or static token (legacy)
# ICEBERG_TOKEN="op://Personal/lakekeeper-token/credential"

PAYLOAD_CMS_TOKEN="op://Personal/Payload ecommerce/credential"
```

Then run with `op run` (automatically used by `just dlt::op-run`):

```bash
# From the ecommerce root directory
just dlt::op-run  # Runs: op run --env-file=.env.local -- python payload_pipeline.py
```

#### Alternative: Run without 1Password

If you're not using 1Password, use `just dlt::run` instead:

```bash
# From the ecommerce root directory
just dlt::run  # Runs: source .env.local && python payload_pipeline.py
```

#### Getting a JWT Token Manually

```bash
# From the ecommerce root directory
just payload::get-jwt
# Copy the output token and set it in .env.local
```

**Note:** `.env.local` is gitignored to prevent committing secrets.

## Usage

The pipeline has a single `load()` function that can be configured via environment variables.

**Note:** All commands should be run from the **ecommerce root directory** using the `just dlt::` prefix.

### Incremental Load (Default)

The default mode uses `merge` write disposition, which works correctly with paginated REST APIs:

```bash
# From the ecommerce root directory
just dlt::op-run

# First run: loads all data from INITIAL_TIMESTAMP
# Subsequent runs: loads only new/updated records
```

### Full Refresh Load

To reload all data from scratch, clear the pipeline state first:

```bash
just dlt::clear    # Clear pipeline state
just dlt::op-run   # Loads all data from INITIAL_TIMESTAMP
```

### Debug Mode (DuckDB Testing)

For testing without Iceberg:

```bash
PIPELINE_MODE=debug just dlt::op-run
```

## Environment Variables Reference

### Pipeline Configuration

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `PIPELINE_MODE` | `production`, `debug` | `production` | Use `debug` to load to DuckDB for testing |
| `WRITE_DISPOSITION` | `merge`, `replace`, `append`, `skip` | `merge` | Data write strategy (see below). **Default is `merge`** because paginated REST API sources stream pages incrementally. |
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
| `OIDC_CLIENT_ID` | (optional) | OAuth2 client ID for authentication (recommended for production) |
| `OIDC_CLIENT_SECRET` | (optional) | OAuth2 client secret for authentication (recommended for production) |
| `ICEBERG_TOKEN` | (optional) | Static bearer token for REST Catalog (legacy, deprecated) |
| `BATCH_SIZE` | `1000` | Number of records to process per batch |

**Authentication Methods:**

- **OAuth2 Client Credentials (recommended)**: Set `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET`. Tokens are automatically managed by PyIceberg. Ideal for Airflow and long-running processes.
- **Static Token (legacy)**: Set `ICEBERG_TOKEN`. Note that tokens may expire quickly, requiring manual refresh.

### Write Disposition Modes

- **`merge`** (default): Delete rows matching primary keys, then append new data (upsert)
    - ✅ **Recommended for paginated REST API sources** (like Payload CMS)
    - Works correctly with incremental page streaming
    - Safe for both full refresh and incremental loads

- **`replace`**: Delete all existing data, then append new data (full refresh)
    - ⚠️ **NOT compatible with paginated sources!**
    - `rest_api_source` yields pages one by one, and `replace` overwrites on each page
    - Result: Only the last page remains in the table
    - Only use this with non-paginated sources or sources that buffer all data first

- **`append`**: Simply append new data without deletion
    - May create duplicates if same records are loaded multiple times

- **`skip`**: Skip loading if table already exists

### Incremental Loading with `merge` Mode

**`merge` mode is the default** because it works correctly with paginated REST API sources and supports both full refresh and incremental loading.

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
- ✅ **Same command every time** - `just dlt::op-run` works for all runs
- ✅ **State persisted** - Stored in `~/.dlt/pipelines/payload_to_iceberg/state/`
- ✅ **Works with pagination** - Correctly collects all pages from the REST API
- ⚠️ **Reset when needed** - Run `just dlt::clear` to start fresh from `INITIAL_TIMESTAMP`

**Default Configuration (Recommended):**

The default `.env.local` configuration works for both development and production:

```bash
WRITE_DISPOSITION="merge"  # Default - safe for all scenarios
# INITIAL_TIMESTAMP="2024-01-01T00:00:00Z"  # Optional: defaults to 2024-01-01
```

**For Production (Incremental Loads):**

Run the same command every day (or via cron/Airflow):

```bash
just dlt::op-run  # Day 1: loads all data since INITIAL_TIMESTAMP
just dlt::op-run  # Day 2+: loads only new/updated records
```

**For Development (Full Refresh Testing):**

Use `merge` mode with state reset:

```bash
just dlt::clear    # Clear pipeline state
just dlt::op-run   # Loads all data from INITIAL_TIMESTAMP
```

## Running the Pipeline

**Note:** All commands should be run from the **ecommerce root directory** using the `just dlt::` prefix.

### With 1Password (Recommended)

When using 1Password references in `.env.local`:

```bash
# Incremental load (default - merge mode)
just dlt::op-run

# Full refresh (clear state first)
just dlt::clear && just dlt::op-run

# Incremental load with custom start date (first run only)
INITIAL_TIMESTAMP="2025-01-01T00:00:00Z" just dlt::op-run

# Debug with DuckDB
PIPELINE_MODE=debug just dlt::op-run
```

### Without 1Password

When using plain values in `.env.local`:

```bash
# Incremental load (default - merge mode)
just dlt::run

# Full refresh (clear state first)
just dlt::clear && just dlt::run

# Incremental load with custom start date (first run only)
INITIAL_TIMESTAMP="2025-01-01T00:00:00Z" just dlt::run

# Debug with DuckDB
PIPELINE_MODE=debug just dlt::run
```

### Direct Python Execution

From the `data/ingestion` directory:

```bash
# Incremental load (default - merge mode)
python payload_pipeline.py

# Full refresh (clear state first)
just clear && python payload_pipeline.py

# Incremental load with custom start date (first run only)
INITIAL_TIMESTAMP="2025-01-01T00:00:00Z" python payload_pipeline.py

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
