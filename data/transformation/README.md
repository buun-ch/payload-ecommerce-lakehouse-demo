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

- Python 3.12+
- Access to Trino cluster

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

```plain
models/
├── staging/           # Clean raw data from Iceberg
│   ├── sources.yml    # Source definitions
│   └── stg_*.sql      # Staging views (JSON parsing)
└── marts/             # Star schema for analytics
    ├── schema.yml     # Documentation and tests
    ├── fact_*.sql     # Fact tables
    └── dim_*.sql      # Dimension tables
```

## Data Models

### Staging Layer (Views)

Staging models clean and standardize raw data from Iceberg, handling JSON extraction with Trino functions.

| Model | Description | Key Transformations |
| :--- | :--- | :--- |
| `stg_products` | Product catalog | Clean product data, price formatting |
| `stg_categories` | Product categories | Category master data |
| `stg_variants` | Product variants | Extract variant details from JSON |
| `stg_customers` | Customer profiles | Filter customer users, extract roles from JSON array |
| `stg_orders` | Order headers | Extract customer ID from JSON object |
| `stg_order_items` | Order line items | Unnest items JSON array, parse nested product/variant data |
| `stg_transactions` | Payment transactions | Extract order and customer IDs from JSON |
| `stg_carts` | Shopping carts | Handle guest vs registered customer carts |

### Marts Layer (Tables)

Marts models create a star schema optimized for analytics and BI tools.

#### Fact Tables

| Table | Type | Description | Grain |
| :--- | :--- | :--- | :--- |
| `fact_orders` | Incremental | Order-level transactions | One row per order |
| `fact_order_items` | Incremental | Line item details | One row per product in order |
| `fact_transactions` | Incremental | Payment transactions | One row per payment transaction |

**Incremental Strategy**: New/updated records only, based on `updated_at` timestamp.

#### Dimension Tables

| Table | Type | Description | Key Attributes |
| :--- | :--- | :--- | :--- |
| `dim_products` | Table | Product catalog | Product name, slug, price, inventory |
| `dim_categories` | Table | Product categories | Category hierarchy |
| `dim_customers` | Table | Customer profiles with metrics | Name, email, segment, LTV, order count |
| `dim_date` | Table | Date dimension (2020-2030) | Year, month, day, weekday |

### Schema Locations

- **Development**: `ecommerce_dev.ecommerce_staging`, `ecommerce_dev.ecommerce_marts`
- **Production**: `ecommerce.ecommerce_staging`, `ecommerce.ecommerce_marts`

All models are stored in Iceberg format and queryable via Trino, DuckDB, or Spark.

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

## Documentation

dbt automatically generates interactive documentation for your data models, including:

- **Model lineage**: Visual data flow from sources → staging → marts
- **Column descriptions**: Detailed documentation for each table and column
- **Test definitions**: All configured data quality tests
- **SQL code**: Source and compiled SQL for each model

### Generating Documentation

```bash
# Generate documentation
just dbt::op-docs-generate

# Serve documentation site (opens on http://localhost:8080)
just dbt::op-docs-serve
```

### Navigating the Documentation

1. **Project Overview**: Left sidebar shows all models organized by layer (staging, marts)
2. **Model Details**: Click any model to view:
   - Description and metadata
   - Column definitions with data types
   - Configured tests
   - Dependencies (upstream and downstream)
3. **Lineage Graph**: Click the graph icon (bottom-right) to visualize data flow
   - Green nodes: Source tables
   - Blue nodes: dbt models
   - Arrows: Data dependencies

### Adding Documentation

Documentation is defined in YAML files:

**For sources** (`models/staging/sources.yml`):

```yaml
sources:
  - name: ecommerce
    tables:
      - name: orders
        description: Raw orders from Payload CMS
        columns:
          - name: id
            description: Order ID
```

**For models** (`models/marts/schema.yml`):

```yaml
models:
  - name: fact_orders
    description: Fact table containing order-level transactions
    columns:
      - name: order_id
        description: Unique order identifier
```

## Testing

dbt provides built-in data quality testing to validate your transformations.

### Running Tests

```bash
# Run all tests
just dbt::op-test

# Run tests for specific model
just dbt::op-test --select fact_orders

# Run tests for specific layer
just dbt::op-test --select staging
just dbt::op-test --select marts
```

### Test Output

Terminal output shows real-time results:

```
Done. PASS=40 WARN=0 ERROR=0 SKIP=0 NO-OP=0 TOTAL=40
```

### Configured Tests

This project includes **40 data quality tests** across sources and models:

#### Source Tests (`models/staging/sources.yml`)

- **Uniqueness**: Primary keys (id columns) are unique
- **Not Null**: Required fields always have values

Example:

```yaml
columns:
  - name: id
    tests:
      - unique:
          description: "Validates that order IDs from Payload CMS are unique"
      - not_null:
          description: "Ensures all raw order records have an ID"
```

#### Model Tests (`models/marts/schema.yml`)

- **Uniqueness**: Primary keys in dimension and fact tables
- **Not Null**: Foreign keys and required business fields
- **Accepted Values**: Categorical fields have valid values only

Example:

```yaml
columns:
  - name: customer_segment
    tests:
      - accepted_values:
          arguments:
            values: ['Champions', 'Loyal', 'Potential Loyalists', 'New Customers', 'Dormant']
          description: "Validates customer segment values match the RFM-based classification"
```

### Test Types

| Test Type | Purpose | Example |
| :--- | :--- | :--- |
| `unique` | Ensures column values are unique | Primary keys |
| `not_null` | Ensures column has no NULL values | Required fields |
| `accepted_values` | Validates against allowed value list | Status, category fields |
| `relationships` | Validates foreign key references | Customer ID in orders exists in customers table |

### Test Results

#### 1. Command Line (Real-time)

The simplest way to see test results:

```bash
just dbt::op-test
# Output shows PASS/FAIL for each test
```

#### 2. run_results.json (Detailed)

After running tests, results are saved in `target/run_results.json`:

```bash
# View test summary
cat target/run_results.json | jq '{
  generated_at: .metadata.generated_at,
  total_tests: [.results[] | select(.unique_id | startswith("test."))] | length,
  passed: [.results[] | select((.unique_id | startswith("test.")) and .status == "success")] | length
}'

# List all test results
cat target/run_results.json | jq -r '.results[] |
  select(.unique_id | startswith("test.")) |
  {test: .unique_id, status: .status}'
```

#### 3. Advanced: Test Result Visualization

For test result dashboards and monitoring, consider:

- **[Elementary](https://www.elementary-data.com/)**: Open-source data observability with test result UI, alerts, and lineage
- **[dbt Cloud](https://www.getdbt.com/product/dbt-cloud)**: Official SaaS with test result UI and CI/CD
- **[Re_data](https://www.getre.io/)**: Open-source data quality monitoring

### Adding Custom Tests

#### Generic Tests

Add to model YAML:

```yaml
columns:
  - name: order_total
    tests:
      - not_null
      - dbt_utils.accepted_range:
          min_value: 0
          max_value: 1000000
```

#### Singular Tests

Create SQL file in `tests/` directory:

```sql
-- tests/assert_positive_order_amounts.sql
SELECT *
FROM {{ ref('fact_orders') }}
WHERE amount_usd < 0
```

The test fails if any rows are returned.

### Best Practices

1. **Test primary keys**: Always add `unique` and `not_null` to primary keys
2. **Test foreign keys**: Use `relationships` test to validate referential integrity
3. **Add descriptions**: Explain what each test validates and why it matters
4. **Run before deployment**: Include `dbt test` in your CI/CD pipeline
5. **Monitor failures**: Set up alerts for test failures in production

## Analytics & BI

For sample analytical queries and Metabase dashboard examples, see:

📊 **[Analytics Query Examples](../../docs/analysis_queries.md)**

This includes:

- Sales performance analysis (daily/monthly trends, KPIs)
- Product analysis (best sellers, category performance, inventory alerts)
- Customer analysis (segmentation, LTV, cohort analysis, RFM)
- Transaction & payment analysis
- Advanced analytics (cohort retention, product affinity)
- Metabase dashboard recommendations

## Resources

- [dbt Documentation](https://docs.getdbt.com/)
- [dbt-trino Adapter](https://github.com/starburstdata/dbt-trino)
- [Trino Documentation](https://trino.io/docs/current/)
- [Apache Iceberg](https://iceberg.apache.org/)
- [Lakekeeper (Iceberg REST Catalog)](https://github.com/lakekeeper/lakekeeper)
