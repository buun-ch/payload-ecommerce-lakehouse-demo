# Ecommerce Analytics - Sample Queries

This document contains typical analytical queries for the ecommerce star schema. These queries can be executed in Metabase or any SQL client connected to Trino.

## Schema Overview

```plain
Marts Layer (Star Schema):
├── Fact Tables
│   ├── fact_orders - Order-level transactions
│   ├── fact_order_items - Line item details
│   └── fact_transactions - Payment transactions
├── Dimension Tables
│   ├── dim_products - Product catalog
│   ├── dim_categories - Product categories
│   ├── dim_customers - Customer profiles with metrics
│   └── dim_date - Date dimension (2020-2030)
└── Bridge Tables
    └── bridge_product_categories - Many-to-many product-category relationships
```

## 1. Sales Performance Analysis

### 1.1 Daily Sales Trend (Last 30 Days)

```sql
SELECT
    d.date_day,
    d.day_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(o.amount_usd) AS total_revenue_usd,
    AVG(o.amount_usd) AS avg_order_value_usd
FROM ecommerce_marts.fact_orders o
JOIN ecommerce_marts.dim_date d
    ON CAST(o.order_date AS DATE) = d.date_day
WHERE d.date_day >= CURRENT_DATE - INTERVAL '30' DAY
GROUP BY d.date_day, d.day_name
ORDER BY d.date_day DESC;
```

**Visualization**:

- Type: Line chart
- X-axis: `date_day`
- Y-axis: `total_revenue_usd` (can also add `total_orders` as secondary series)

### 1.2 Monthly Revenue Summary

```sql
SELECT
    DATE_FORMAT(d.date_day, '%Y-%m') AS year_month,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COUNT(DISTINCT o.customer_id) AS unique_customers,
    SUM(o.amount_usd) AS total_revenue_usd,
    ROUND(AVG(o.amount_usd), 2) AS avg_order_value_usd,
    ROUND(SUM(o.amount_usd) / CAST(COUNT(DISTINCT o.customer_id) AS DOUBLE), 2) AS revenue_per_customer
FROM ecommerce_marts.fact_orders o
JOIN ecommerce_marts.dim_date d
    ON CAST(o.order_date AS DATE) = d.date_day
GROUP BY DATE_FORMAT(d.date_day, '%Y-%m')
ORDER BY year_month DESC;
```

**Visualization**:

- Type: Bar chart (or table)
- X-axis: `year` and `month` (combine as "YYYY-MM" or use both fields)
- Y-axis: `total_revenue_usd`

### 1.3 Weekend vs Weekday Sales

```sql
SELECT
    CASE WHEN d.is_weekend THEN 'Weekend' ELSE 'Weekday' END AS period_type,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(o.amount_usd) AS total_revenue_usd,
    ROUND(AVG(o.amount_usd), 2) AS avg_order_value_usd
FROM ecommerce_marts.fact_orders o
JOIN ecommerce_marts.dim_date d
    ON CAST(o.order_date AS DATE) = d.date_day
WHERE d.date_day >= CURRENT_DATE - INTERVAL '90' DAY
GROUP BY CASE WHEN d.is_weekend THEN 'Weekend' ELSE 'Weekday' END;
```

**Visualization**:

- Type: Pie chart or bar chart
- Pie chart: Dimension: `period_type`, Metric: `total_revenue_usd`
- Bar chart: X-axis: `period_type`, Y-axis: `total_revenue_usd`

## 2. Product Analysis

### 2.1 Top 10 Best Selling Products

```sql
WITH product_categories AS (
    SELECT
        pc.product_id,
        ARRAY_JOIN(ARRAY_AGG(c.category_name), ', ') AS category_names
    FROM ecommerce_marts.bridge_product_categories pc
    JOIN ecommerce_marts.dim_categories c
        ON pc.category_id = c.category_id
    GROUP BY pc.product_id
)
SELECT
    p.product_name,
    COALESCE(pc.category_names, 'Uncategorized') AS categories,
    COUNT(DISTINCT oi.order_id) AS times_ordered,
    SUM(oi.quantity) AS total_quantity_sold,
    SUM(oi.line_total_usd) AS total_revenue_usd,
    ROUND(AVG(oi.unit_price_usd), 2) AS avg_unit_price_usd
FROM ecommerce_marts.fact_order_items oi
JOIN ecommerce_marts.dim_products p
    ON oi.product_id = p.product_id
LEFT JOIN product_categories pc
    ON p.product_id = pc.product_id
GROUP BY p.product_name, pc.category_names
ORDER BY total_revenue_usd DESC
LIMIT 10;
```

**Visualization**:

- Type: Horizontal bar chart
- X-axis: `total_revenue_usd`
- Y-axis: `product_name`

### 2.2 Category Performance

```sql
SELECT
    c.category_name,
    COUNT(DISTINCT oi.order_id) AS total_orders,
    SUM(oi.quantity) AS items_sold,
    SUM(oi.line_total_usd) AS total_revenue_usd,
    ROUND(AVG(oi.line_total_usd), 2) AS avg_line_value_usd
FROM ecommerce_marts.fact_order_items oi
JOIN ecommerce_marts.bridge_product_categories pc
    ON oi.product_id = pc.product_id
JOIN ecommerce_marts.dim_categories c
    ON pc.category_id = c.category_id
GROUP BY c.category_name
ORDER BY total_revenue_usd DESC;
```

**Visualization**:

- Type: Treemap or donut chart
- Treemap: Dimension: `category_name`, Metric: `total_revenue_usd`
- Donut chart: Dimension: `category_name`, Metric: `total_revenue_usd`

### 2.3 Inventory Alert - Low Stock Products

```sql
WITH product_categories AS (
    SELECT
        pc.product_id,
        ARRAY_JOIN(ARRAY_AGG(c.category_name), ', ') AS category_names
    FROM ecommerce_marts.bridge_product_categories pc
    JOIN ecommerce_marts.dim_categories c
        ON pc.category_id = c.category_id
    GROUP BY pc.product_id
)
SELECT
    p.product_name,
    COALESCE(pc.category_names, 'Uncategorized') AS categories,
    p.inventory,
    p.price_usd,
    p.is_low_stock,
    p.is_in_stock
FROM ecommerce_marts.dim_products p
LEFT JOIN product_categories pc
    ON p.product_id = pc.product_id
WHERE p.is_low_stock = TRUE OR p.is_in_stock = FALSE
ORDER BY p.inventory ASC;
```

**Visualization**:

- Type: Table
- Display all columns for detailed alert view

## 3. Customer Analysis

### 3.1 Customer Segmentation Overview

```sql
SELECT
    customer_segment,
    COUNT(*) AS customer_count,
    SUM(total_orders) AS total_orders,
    ROUND(SUM(lifetime_value_usd), 2) AS total_ltv_usd,
    ROUND(AVG(lifetime_value_usd), 2) AS avg_ltv_usd,
    ROUND(AVG(total_orders), 2) AS avg_orders_per_customer
FROM ecommerce_marts.dim_customers
GROUP BY customer_segment
ORDER BY total_ltv_usd DESC;
```

**Visualization**:

- Type: Bar chart (stacked or grouped) or table
- Bar chart: X-axis: `customer_segment`, Y-axis: `total_ltv_usd` or `customer_count`

### 3.2 Top 20 Customers by Lifetime Value

```sql
SELECT
    customer_name,
    customer_email,
    customer_segment,
    total_orders,
    lifetime_value_usd,
    CAST(first_order_date AS DATE) AS first_order_date,
    CAST(last_order_date AS DATE) AS last_order_date,
    customer_lifetime_days
FROM ecommerce_marts.dim_customers
ORDER BY lifetime_value_usd DESC
LIMIT 20;
```

**Visualization**:

- Type: Table
- Display all columns for customer details

### 3.3 Customer Acquisition by Month

```sql
SELECT
    DATE_FORMAT(customer_since, '%Y-%m') AS acquisition_month,
    COUNT(*) AS new_customers,
    SUM(total_orders) AS total_orders_from_cohort,
    ROUND(SUM(lifetime_value_usd), 2) AS cohort_ltv_usd,
    ROUND(AVG(lifetime_value_usd), 2) AS avg_customer_ltv_usd
FROM ecommerce_marts.dim_customers
GROUP BY DATE_FORMAT(customer_since, '%Y-%m')
ORDER BY acquisition_month DESC;
```

**Visualization**:

- Type: Area chart or line chart
- X-axis: `acquisition_month`
- Y-axis: `new_customers` (can add `cohort_ltv_usd` as secondary series)

## 4. Transaction & Payment Analysis

### 4.1 Payment Success Rate

```sql
SELECT
    status,
    COUNT(*) AS transaction_count,
    ROUND(SUM(amount_usd), 2) AS total_amount_usd,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM ecommerce_marts.fact_transactions
GROUP BY status
ORDER BY transaction_count DESC;
```

**Visualization**:

- Type: Pie chart
- Dimension: `status`
- Metric: `transaction_count` or `total_amount_usd`

### 4.2 Daily Transaction Volume

```sql
SELECT
    d.date_day,
    COUNT(*) AS transaction_count,
    SUM(CASE WHEN t.status = 'succeeded' THEN 1 ELSE 0 END) AS successful_transactions,
    SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END) AS failed_transactions,
    ROUND(SUM(t.amount_usd), 2) AS total_amount_usd
FROM ecommerce_marts.fact_transactions t
JOIN ecommerce_marts.dim_date d
    ON CAST(t.transaction_date AS DATE) = d.date_day
WHERE d.date_day >= CURRENT_DATE - INTERVAL '30' DAY
GROUP BY d.date_day
ORDER BY d.date_day DESC;
```

**Visualization**:

- Type: Line chart (multiple series)
- X-axis: `date_day`
- Y-axis: `transaction_count`, `successful_transactions`, `failed_transactions` (as separate series)

## 5. Advanced Analytics

### 5.1 Cohort Analysis - Customer Retention

```sql
WITH first_purchase AS (
    SELECT
        customer_id,
        MIN(CAST(order_date AS DATE)) AS first_order_date
    FROM ecommerce_marts.fact_orders
    GROUP BY customer_id
),
cohort_orders AS (
    SELECT
        fp.first_order_date,
        DATE_FORMAT(fp.first_order_date, '%Y-%m') AS cohort_month,
        o.customer_id,
        CAST(o.order_date AS DATE) AS order_date,
        DATE_DIFF('month', fp.first_order_date, CAST(o.order_date AS DATE)) AS months_since_first
    FROM first_purchase fp
    JOIN ecommerce_marts.fact_orders o
        ON fp.customer_id = o.customer_id
),
cohort_data AS (
    SELECT
        cohort_month,
        months_since_first,
        COUNT(DISTINCT customer_id) AS active_customers
    FROM cohort_orders
    WHERE cohort_month >= DATE_FORMAT(CURRENT_DATE - INTERVAL '12' MONTH, '%Y-%m')
    GROUP BY cohort_month, months_since_first
)
SELECT
    cohort_month,
    months_since_first,
    active_customers,
    FIRST_VALUE(active_customers) OVER (
        PARTITION BY cohort_month
        ORDER BY months_since_first
    ) AS cohort_size,
    ROUND(
        active_customers * 100.0 /
        NULLIF(FIRST_VALUE(active_customers) OVER (
            PARTITION BY cohort_month
            ORDER BY months_since_first
        ), 0),
        2
    ) AS retention_rate
FROM cohort_data
ORDER BY cohort_month DESC, months_since_first ASC;
```

**Visualization**:

- Type: Pivot table or heatmap
- X-axis (columns): `months_since_first`
- Y-axis (rows): `cohort_month`
- Values: `retention_rate` (color-coded by percentage)

### 5.2 RFM Analysis (Recency, Frequency, Monetary)

```sql
WITH customer_rfm AS (
    SELECT
        c.customer_id,
        c.customer_name,
        c.customer_email,
        DATE_DIFF('day', CAST(c.last_order_date AS DATE), CURRENT_DATE) AS recency_days,
        c.total_orders AS frequency,
        c.lifetime_value_usd AS monetary
    FROM ecommerce_marts.dim_customers c
    WHERE c.total_orders > 0
)
SELECT
    customer_id,
    customer_name,
    customer_email,
    recency_days,
    frequency,
    ROUND(monetary, 2) AS monetary_usd,
    CASE
        WHEN recency_days <= 30 AND frequency >= 5 AND monetary >= 500 THEN 'Champions'
        WHEN recency_days <= 30 AND frequency >= 3 THEN 'Loyal Customers'
        WHEN recency_days <= 60 AND monetary >= 300 THEN 'Potential Loyalists'
        WHEN recency_days <= 90 THEN 'Recent Customers'
        WHEN recency_days > 180 THEN 'At Risk'
        ELSE 'Needs Attention'
    END AS rfm_segment
FROM customer_rfm
ORDER BY monetary DESC;
```

**Visualization**:

- Type: Scatter plot or table
- Scatter plot: X-axis: `recency_days`, Y-axis: `monetary_usd`, Size: `frequency`, Color: `rfm_segment`
- Table: Group by `rfm_segment`

### 5.3 Product Affinity Analysis

```sql
WITH product_pairs AS (
    SELECT
        oi1.product_id AS product_a_id,
        oi2.product_id AS product_b_id,
        COUNT(DISTINCT oi1.order_id) AS times_bought_together
    FROM ecommerce_marts.fact_order_items oi1
    JOIN ecommerce_marts.fact_order_items oi2
        ON oi1.order_id = oi2.order_id
        AND oi1.product_id < oi2.product_id
    GROUP BY oi1.product_id, oi2.product_id
    HAVING COUNT(DISTINCT oi1.order_id) >= 3
)
SELECT
    p1.product_name AS product_a,
    p2.product_name AS product_b,
    pp.times_bought_together,
    ROUND(
        pp.times_bought_together * 100.0 /
        (SELECT COUNT(DISTINCT order_id) FROM ecommerce_marts.fact_orders),
        2
    ) AS frequency_percentage
FROM product_pairs pp
JOIN ecommerce_marts.dim_products p1 ON pp.product_a_id = p1.product_id
JOIN ecommerce_marts.dim_products p2 ON pp.product_b_id = p2.product_id
ORDER BY times_bought_together DESC
LIMIT 20;
```

**Visualization**:

- Type: Table (network diagrams not directly supported)
- Display columns: `product_a`, `product_b`, `times_bought_together`, `frequency_percentage`
- Use for product recommendation insights

## 6. Key metrics Queries

### 6.1 Key Metrics Summary (Last 30 Days)

```sql
WITH current_period AS (
    SELECT
        COUNT(DISTINCT order_id) AS total_orders,
        COUNT(DISTINCT customer_id) AS unique_customers,
        SUM(amount_usd) AS total_revenue,
        AVG(amount_usd) AS avg_order_value
    FROM ecommerce_marts.fact_orders
    WHERE order_date >= CURRENT_DATE - INTERVAL '30' DAY
),
previous_period AS (
    SELECT
        COUNT(DISTINCT order_id) AS total_orders,
        COUNT(DISTINCT customer_id) AS unique_customers,
        SUM(amount_usd) AS total_revenue,
        AVG(amount_usd) AS avg_order_value
    FROM ecommerce_marts.fact_orders
    WHERE order_date >= CURRENT_DATE - INTERVAL '60' DAY
      AND order_date < CURRENT_DATE - INTERVAL '30' DAY
)
SELECT
    'Total Orders' AS metric,
    cp.total_orders AS current_value,
    pp.total_orders AS previous_value,
    ROUND((cp.total_orders - pp.total_orders) * 100.0 / pp.total_orders, 2) AS growth_percentage
FROM current_period cp, previous_period pp
UNION ALL
SELECT
    'Unique Customers',
    cp.unique_customers,
    pp.unique_customers,
    ROUND((cp.unique_customers - pp.unique_customers) * 100.0 / pp.unique_customers, 2)
FROM current_period cp, previous_period pp
UNION ALL
SELECT
    'Total Revenue (USD)',
    cp.total_revenue,
    pp.total_revenue,
    ROUND((cp.total_revenue - pp.total_revenue) * 100.0 / pp.total_revenue, 2)
FROM current_period cp, previous_period pp
UNION ALL
SELECT
    'Avg Order Value (USD)',
    cp.avg_order_value,
    pp.avg_order_value,
    ROUND((cp.avg_order_value - pp.avg_order_value) * 100.0 / pp.avg_order_value, 2)
FROM current_period cp, previous_period pp;
```

**Visualization**:

- Type: Number (scalar) cards
- Create separate cards for each metric row
- Display `current_value` with `growth_percentage` as trend indicator
- Use color coding (green for positive growth, red for negative)

## Metabase Dashboard Recommendations

### Executive Dashboard

- Monthly revenue trend (Query 1.2)
- Key metrics summary (Query 6.1)
- Customer segmentation (Query 3.1)
- Category performance (Query 2.2)

### Product Performance Dashboard

- Top 10 products (Query 2.1)
- Category analysis (Query 2.2)
- Low stock alerts (Query 2.3)
- Product affinity (Query 5.3)

### Customer Analytics Dashboard

- Customer segmentation (Query 3.1)
- Top customers by LTV (Query 3.2)
- RFM analysis (Query 5.2)
- Cohort retention (Query 5.1)

### Operations Dashboard

- Daily sales trend (Query 1.1)
- Payment success rate (Query 4.1)
- Transaction volume (Query 4.2)
- Weekend vs weekday (Query 1.3)

## Tips for Metabase Visualization

1. **Use filters**: Add date range filters to all time-based queries
2. **Color coding**: Use consistent colors for metrics (revenue=green, orders=blue)
3. **Goal lines**: Add target lines for key metrics
4. **Drill-downs**: Enable click-through from summary to detail views
5. **Auto-refresh**: Set dashboards to auto-refresh every 15-30 minutes
