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
WRITE_DISPOSITION="replace"  # "replace" for full refresh, "merge" for incremental
# PIPELINE_MODE="debug"      # Uncomment for DuckDB testing
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

## Running the Pipeline

### With 1Password (Recommended)

When using 1Password references in `.env.local`:

```bash
# Full refresh (default)
just op-run

# Incremental load
WRITE_DISPOSITION=merge just op-run

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

# Debug with DuckDB
PIPELINE_MODE=debug just run
```

### Direct Python Execution

```bash
# Full refresh to Iceberg
python payload_pipeline.py

# Incremental load to Iceberg
WRITE_DISPOSITION=merge python payload_pipeline.py

# Debug mode with DuckDB
PIPELINE_MODE=debug python payload_pipeline.py
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
