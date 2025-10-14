# Data Stack Integration Guide

This guide explains how to integrate Payload CMS Ecommerce with a modern data stack for analytics and business intelligence.

## 📊 Architecture Overview

```
┌─────────────────────┐
│   Payload CMS       │
│   (PostgreSQL)      │
│   Application DB    │
└──────────┬──────────┘
           │ /api/export/*
           ↓
┌─────────────────────┐
│   dlt (Python)      │
│   Extract & Load    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Apache Iceberg    │
│   + MinIO           │
│   (Raw Data Layer)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   dbt               │
│   Transform         │
│   Star Schema       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   ClickHouse        │
│   Analytics Engine  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Metabase          │
│   BI Dashboard      │
└─────────────────────┘
```

## 🎯 Data Pipeline Layers

### Layer 1: Source (Payload CMS)

- **Database**: PostgreSQL (operational data)
- **API Endpoint**: `/api/export/{collection}`
- **Purpose**: E-commerce application database (normalized OLTP schema)

### Layer 2: Extract & Load (dlt)

- **Tool**: dlt (data load tool)
- **Source**: Payload CMS REST API
- **Destination**: Apache Iceberg tables in MinIO
- **Pattern**: ELT (Extract, Load, Transform)
- **Features**:
    - Incremental loading via `updated_since` parameter
    - Automatic schema evolution
    - Data versioning with Iceberg

### Layer 3: Raw Data Lake (Iceberg + MinIO)

- **Format**: Apache Iceberg
- **Storage**: MinIO (S3-compatible object storage)
- **Catalog**: Iceberg REST Catalog
- **Tables Created**: Raw copies of source collections
    - `raw.orders`
    - `raw.products`
    - `raw.variants`
    - `raw.users`
    - `raw.transactions`
    - `raw.carts`
    - `raw.categories`
    - `raw.addresses`

### Layer 4: Transform (dbt)

- **Tool**: dbt (data build tool)
- **Source**: Iceberg raw tables
- **Destination**: Iceberg analytics tables (star schema)
- **Purpose**: Transform normalized OLTP schema into denormalized star schema for analytics
- **Output**: Fact and dimension tables optimized for OLAP queries

### Layer 5: Analytics Engine (ClickHouse)

- **Tool**: ClickHouse
- **Source**: Iceberg tables via Iceberg connector
- **Purpose**: Fast analytical queries on star schema
- **Features**: Columnar storage, parallel processing, aggregations

### Layer 6: Visualization (Metabase)

- **Tool**: Metabase
- **Source**: ClickHouse
- **Purpose**: Business intelligence dashboards and reports

## 🔌 Payload CMS REST API

### Available Endpoints

All ecommerce collections are available via the standard Payload REST API:

**Fact Data Sources:**

- `GET /api/orders` - Order transactions
- `GET /api/transactions` - Payment transactions
- `GET /api/carts` - Shopping cart activities

**Dimension Data Sources:**

- `GET /api/products` - Product master data
- `GET /api/variants` - Product variant details
- `GET /api/users` - Customer information
- `GET /api/categories` - Product categories
- `GET /api/addresses` - Shipping/billing addresses
- `GET /api/variantTypes` - Variant type definitions
- `GET /api/variantOptions` - Variant option values

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Records per page |
| `page` | integer | 1 | Page number |
| `where` | JSON object | - | Filter conditions (see below) |
| `sort` | string | - | Sort field (prefix `-` for DESC) |
| `depth` | integer | 0 | Related data depth (0-10) |
| `select` | string | - | Fields to return (comma-separated) |

**Common Where Query Operators:**

- `equals`, `not_equals`
- `greater_than`, `greater_than_equal`
- `less_than`, `less_than_equal`
- `like`, `contains`
- `in`, `not_in`, `all`
- `exists`

### API Examples

**Full sync (initial load):**

```bash
curl "http://localhost:3000/api/orders?limit=100&page=1"
```

**Incremental sync (updated since timestamp):**

```bash
curl "http://localhost:3000/api/orders?where[updatedAt][greater_than_equal]=2024-12-10T00:00:00Z&limit=100"
```

**Incremental sync (created since timestamp):**

```bash
curl "http://localhost:3000/api/orders?where[createdAt][greater_than_equal]=2024-12-10T00:00:00Z&limit=100"
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

**Response format:**

```json
{
  "docs": [
    {
      "id": "123",
      "amount": 4999,
      "currency": "USD",
      "customer": { "id": "456", "email": "customer@example.com" },
      "items": [...],
      "createdAt": "2024-12-10T12:00:00Z",
      "updatedAt": "2024-12-10T12:00:00Z"
    }
  ],
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

## 🐍 dlt Integration

### Installation

```bash
pip install dlt[filesystem]
pip install pyiceberg
```

### Basic dlt Pipeline Example

```python
import dlt
from dlt.sources.rest_api import rest_api_source

# Define Payload CMS source using standard API
payload_source = rest_api_source({
    "client": {
        "base_url": "http://localhost:3000/api/",
    },
    "resources": [
        {
            "name": "orders",
            "endpoint": {
                "path": "orders",
                "params": {
                    "limit": 100,
                    "sort": "createdAt",
                    "depth": 2,  # Load related data
                },
                "paginator": {
                    "type": "page_number",
                    "page_param": "page",
                    "total_path": "totalPages",
                    "maximum_page": 1000,
                },
                "data_selector": "docs",  # Standard Payload response format
            },
        },
        {
            "name": "products",
            "endpoint": {
                "path": "products",
                "params": {
                    "limit": 100,
                    "depth": 2,
                },
                "data_selector": "docs",
            },
        },
        {
            "name": "categories",
            "endpoint": {
                "path": "categories",
                "params": {
                    "limit": 100,
                },
                "data_selector": "docs",
            },
        },
        {
            "name": "variants",
            "endpoint": {
                "path": "variants",
                "params": {
                    "limit": 100,
                    "depth": 2,
                },
                "data_selector": "docs",
            },
        },
        # Add more resources...
    ],
})

# Load to Iceberg
pipeline = dlt.pipeline(
    pipeline_name="payload_to_iceberg",
    destination="filesystem",  # Or use Iceberg destination
    dataset_name="raw",
)

load_info = pipeline.run(payload_source)
print(load_info)
```

### Incremental Loading

dlt automatically tracks the last loaded timestamp using Payload's `where` query syntax:

```python
import dlt
from dlt.sources.rest_api import rest_api_source
from dlt.sources.helpers.rest_client.paginators import PageNumberPaginator

# Configure incremental loading with Payload's where query
payload_source = rest_api_source({
    "client": {
        "base_url": "http://localhost:3000/api/",
    },
    "resources": [
        {
            "name": "orders",
            "endpoint": {
                "path": "orders",
                "params": {
                    "limit": 100,
                    "depth": 2,
                    # Incremental parameter using where query
                    "where[updatedAt][greater_than_equal]": {
                        "type": "incremental",
                        "cursor_path": "updatedAt",
                        "initial_value": "2024-01-01T00:00:00Z",
                    },
                },
                "paginator": PageNumberPaginator(
                    page_param="page",
                    total_path="totalPages",
                ),
                "data_selector": "docs",
            },
            "write_disposition": "merge",
            "primary_key": "id",
        },
    ],
})

pipeline = dlt.pipeline(
    pipeline_name="payload_incremental",
    destination="filesystem",
    dataset_name="raw",
)

load_info = pipeline.run(payload_source)
print(load_info)
```

**How it works:**

1. First run: Loads all records where `updatedAt >= 2024-01-01T00:00:00Z`
2. Subsequent runs: dlt tracks the maximum `updatedAt` value from previous run
3. Next run: Only loads records updated since last run
4. `write_disposition="merge"` ensures records are upserted based on `primary_key`

## 🏗️ Star Schema Design (dbt)

### Fact Tables (in Iceberg)

**`fact_orders`**

```sql
-- models/marts/fact_orders.sql
{{ config(
    materialized='incremental',
    unique_key='order_id',
    file_format='iceberg'
) }}

SELECT
    o.id AS order_id,
    o.customer_id,
    o.amount,
    o.currency,
    DATE(o.created_at) AS order_date_key,
    o.status,
    o.created_at,
    o.updated_at
FROM {{ ref('raw_orders') }} o
{% if is_incremental() %}
WHERE o.updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

**`fact_order_items`**

```sql
-- models/marts/fact_order_items.sql
SELECT
    oi.id AS order_item_id,
    oi.order_id,
    oi.product_id,
    oi.variant_id,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price AS line_total
FROM {{ ref('raw_order_items') }} oi
```

**`fact_transactions`**

```sql
-- models/marts/fact_transactions.sql
SELECT
    t.id AS transaction_id,
    t.order_id,
    t.customer_id,
    t.amount,
    t.currency,
    t.payment_method,
    t.status,
    DATE(t.created_at) AS transaction_date_key,
    t.created_at
FROM {{ ref('raw_transactions') }} t
```

### Dimension Tables (in Iceberg)

**`dim_products`**

```sql
-- models/marts/dim_products.sql
{{ config(
    materialized='table',
    file_format='iceberg'
) }}

SELECT
    p.id AS product_id,
    p.title,
    p.slug,
    p.price_in_usd / 100.0 AS price_usd,
    p.inventory,
    c.id AS category_id,
    c.title AS category_name,
    p.created_at,
    p.updated_at
FROM {{ ref('raw_products') }} p
LEFT JOIN {{ ref('raw_categories') }} c ON p.category_id = c.id
```

**`dim_customers`**

```sql
-- models/marts/dim_customers.sql
SELECT
    u.id AS customer_id,
    u.name,
    u.email,
    u.created_at AS customer_since,
    DATEDIFF('day', u.created_at, CURRENT_DATE) AS customer_lifetime_days
FROM {{ ref('raw_users') }} u
WHERE 'customer' = ANY(u.roles)
```

**`dim_date`**

```sql
-- models/marts/dim_date.sql
-- Generate date dimension table
WITH date_spine AS (
    {{ dbt_utils.date_spine(
        datepart="day",
        start_date="cast('2020-01-01' as date)",
        end_date="cast('2030-12-31' as date)"
    )}}
)
SELECT
    DATE(date_day) AS date_key,
    date_day,
    YEAR(date_day) AS year,
    QUARTER(date_day) AS quarter,
    MONTH(date_day) AS month,
    DAY(date_day) AS day,
    DAYOFWEEK(date_day) AS day_of_week,
    DAYNAME(date_day) AS day_name,
    WEEK(date_day) AS week_of_year
FROM date_spine
```

**`dim_categories`**

```sql
-- models/marts/dim_categories.sql
SELECT
    c.id AS category_id,
    c.title AS category_name,
    c.slug AS category_slug
FROM {{ ref('raw_categories') }} c
```

### dbt Project Structure

```
dbt_project/
├── models/
│   ├── staging/
│   │   ├── stg_orders.sql
│   │   ├── stg_products.sql
│   │   └── stg_customers.sql
│   └── marts/
│       ├── fact_orders.sql
│       ├── fact_order_items.sql
│       ├── fact_transactions.sql
│       ├── dim_products.sql
│       ├── dim_customers.sql
│       ├── dim_categories.sql
│       └── dim_date.sql
└── dbt_project.yml
```

## 📊 Analytics Queries (ClickHouse)

### Daily Sales Report

```sql
SELECT
    d.date_day,
    d.day_name,
    COUNT(DISTINCT f.order_id) AS total_orders,
    SUM(f.amount) / 100.0 AS total_revenue_usd,
    AVG(f.amount) / 100.0 AS avg_order_value_usd
FROM fact_orders f
JOIN dim_date d ON f.order_date_key = d.date_key
WHERE d.date_day >= today() - INTERVAL 30 DAY
GROUP BY d.date_day, d.day_name
ORDER BY d.date_day DESC;
```

### Top Selling Products

```sql
SELECT
    p.product_id,
    p.title,
    p.category_name,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.line_total) / 100.0 AS total_revenue_usd
FROM fact_order_items oi
JOIN dim_products p ON oi.product_id = p.product_id
JOIN fact_orders o ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY p.product_id, p.title, p.category_name
ORDER BY total_revenue_usd DESC
LIMIT 20;
```

### Customer Segmentation

```sql
SELECT
    c.customer_id,
    c.name,
    c.email,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(o.amount) / 100.0 AS lifetime_value_usd,
    MIN(o.created_at) AS first_order_date,
    MAX(o.created_at) AS last_order_date,
    CASE
        WHEN COUNT(o.order_id) >= 10 THEN 'VIP'
        WHEN COUNT(o.order_id) >= 5 THEN 'Regular'
        ELSE 'New'
    END AS customer_segment
FROM dim_customers c
LEFT JOIN fact_orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name, c.email
ORDER BY lifetime_value_usd DESC;
```

### Cart Abandonment Analysis

```sql
SELECT
    DATE(created_at) AS cart_date,
    COUNT(*) AS total_carts,
    SUM(CASE WHEN purchased_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_purchases,
    SUM(CASE WHEN purchased_at IS NULL THEN 1 ELSE 0 END) AS abandoned_carts,
    (SUM(CASE WHEN purchased_at IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS abandonment_rate
FROM raw.carts
WHERE created_at >= today() - INTERVAL 30 DAY
GROUP BY cart_date
ORDER BY cart_date DESC;
```

## 📈 Metabase Dashboard Examples

### Key Metrics to Track

1. **Revenue Metrics**
   - Daily/Monthly revenue trends
   - Revenue by product category
   - Average order value
   - Year-over-year growth

2. **Customer Metrics**
   - New vs returning customers
   - Customer lifetime value
   - Customer acquisition by date
   - Customer segmentation

3. **Product Metrics**
   - Best-selling products
   - Low-stock alerts
   - Product category performance
   - Product profitability

4. **Conversion Metrics**
   - Cart abandonment rate
   - Conversion funnel (cart → order)
   - Time to purchase

## 🔄 Incremental Update Strategy

### How dlt Handles Incremental Loads

1. **First run**: Full load of all data
2. **Subsequent runs**: Only load records where `updatedAt > last_sync_time`
3. **dlt automatically**:
   - Tracks last successful load timestamp
   - Appends `?updated_since=` to API calls
   - Merges/upserts data based on primary key

### dbt Incremental Models

```sql
-- Iceberg supports merge operations for incremental updates
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge'
) }}

SELECT * FROM {{ ref('stg_orders') }}
{% if is_incremental() %}
WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

## 🚀 Quick Start Guide

### 1. Start Payload CMS

```bash
cd /Users/yatsu/SynologyDrive/Projects/ecommerce
pnpm dev
```

### 2. Setup Infrastructure

```bash
# Start MinIO
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Start Iceberg REST Catalog
docker run -p 8181:8181 tabulario/iceberg-rest

# Start ClickHouse
docker run -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server
```

### 3. Run dlt Pipeline

```bash
# Install dependencies
pip install dlt[filesystem] pyiceberg

# Run extraction
python payload_to_iceberg.py
```

### 4. Run dbt Transformations

```bash
# Install dbt
pip install dbt-clickhouse

# Run models
cd dbt_project
dbt run
```

### 5. Connect Metabase

1. Start Metabase: `docker run -p 3001:3000 metabase/metabase`
2. Connect to ClickHouse
3. Create dashboards from star schema tables

## 🔐 Authentication

For protected endpoints (users, transactions):

```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.token')

# Use token in requests
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

Configure in dlt:

```python
payload_source = rest_api_source({
    "client": {
        "base_url": "http://localhost:3000/api/",
        "auth": {
            "type": "bearer",
            "token": "YOUR_JWT_TOKEN_HERE"
        }
    },
    # ... rest of config
})
```

## 📝 Next Steps

1. **Setup Infrastructure**: Deploy MinIO, Iceberg REST Catalog, ClickHouse, and Metabase
2. **Create dlt Pipeline**: Implement data extraction from Payload CMS
3. **Build dbt Models**: Transform raw data into star schema
4. **Setup Scheduling**: Use Apache Airflow or cron for automated pipeline runs
5. **Add Data Quality Tests**: Implement dbt tests for data validation
6. **Monitor Pipeline**: Add logging and alerting for data pipeline failures
7. **Optimize Performance**: Tune dlt batch sizes and dbt incremental strategies
