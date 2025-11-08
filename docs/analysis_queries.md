# Ecommerce Analytics - Sample Queries

This document contains typical analytical queries for the ecommerce star schema. These queries can be executed in Apache Superset or any SQL client connected to Trino.

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

**Superset Visualization**:

- **Chart Type**: Mixed Chart (Recommended for dual metrics)
- **Configuration** (Data tab):
    - **Shared Query Fields**:
        - **X-axis**: `date_day`
        - **Time Grain**: Day (optional, if using time-based grouping)
    - **Query A** (Revenue):
        - **Metrics**: `SUM(total_revenue_usd)` (click "Drop columns/metrics here or click", select Simple tab, choose column and aggregate)
        - **Series**: Line
        - **Area chart**: ✓ (checked - enables area fill for emphasis)
        - **Y Axis**: Primary (Left)
    - **Query B** (Orders):
        - **Metrics**: `SUM(total_orders)`
        - **Series**: Line
        - **Marker**: ✓ (checked - adds data point markers)
        - **Y Axis**: Secondary (Right)
- **Customization** (Customize tab):
    - **Chart Title**:
        - **X Axis**:
            - **Axis Title**: "Date" or leave empty
            - **Axis Title Margin**: 30 (default)
        - **Y Axis (Left)**:
            - **Axis Title**: "Revenue (USD)" or "Total Revenue"
            - **Format**: `$,.0f` (currency for revenue)
        - **Y Axis (Right)**:
            - **Axis Title**: "Number of Orders"
            - **Format**: `,.0f` (number for orders)
    - **Legend**: Enable, position: Top or Right
    - **Tooltip**: Show all metrics
- **Why Mixed Chart**: Revenue and orders have different scales - dual axis prevents small values from being crushed at bottom

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

**Superset Visualization**:

- **Chart Type**: Mixed Chart (Recommended for dual metrics)
- **Configuration** (Data tab):
    - **Shared Query Fields**:
        - **X-axis**: `year_month`
        - **Time Grain**: (not needed, already aggregated by month in SQL)
    - **Query A** (Revenue):
        - **Metrics**: `SUM(total_revenue_usd)`
        - **Series**: Bar
        - **Y Axis**: Primary (Left)
    - **Query B** (Orders):
        - **Metrics**: `SUM(total_orders)`
        - **Series**: Line
        - **Marker**: ✓ (checked - show monthly data points)
        - **Y Axis**: Secondary (Right)
- **Customization** (Customize tab):
    - **Chart Title**:
        - **X Axis**:
            - **Axis Title**: "Month" or leave empty
        - **Y Axis (Left)**:
            - **Axis Title**: "Revenue (USD)" or "Total Revenue"
            - **Format**: `$,.0f` (currency)
        - **Y Axis (Right)**:
            - **Axis Title**: "Number of Orders"
            - **Format**: `,.0f` (number)
    - **Sort**: By `year_month` descending to show recent months first
    - **Legend**: Enable
- **Alternative - Table Configuration**:
    - Columns: All metrics for detailed analysis
    - Enable sorting and filtering for interactive exploration
- **Tip**: Use Big Number with Trendline for current month's revenue with trend

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

**Superset Visualization**:

- **Chart Type**: Pie Chart, Donut Chart, or Bar Chart
- **Pie/Donut Configuration**:
    - Dimension: `period_type`
    - Metric: `total_revenue_usd`
    - Show percentage labels and values
- **Bar Chart Configuration**:
    - X Axis: `period_type`
    - Metrics: `total_revenue_usd`, `total_orders` (grouped bars)
    - Horizontal orientation for better label readability
- **Alternative**: Sunburst Chart for hierarchical breakdown if adding more dimensions

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

**Superset Visualization**:

- **Chart Type**: Bar Chart (Horizontal)
- **Configuration** (Data tab):
    - **Y-axis**: `product_name`
        - Click "Drop columns here or click" under Y-axis
        - Select `product_name`
    - **Y-Axis Sort By**: `SUM(total_revenue_usd)` (sorts bars by revenue)
    - **Y-Axis Sort Ascending**: ✓ (checked - note: in horizontal orientation, this places highest values at top)
    - **Metrics**: `SUM(total_revenue_usd)`
        - Click "Drop columns/metrics here or click"
        - Select Simple tab, column `total_revenue_usd`, aggregate `SUM`
    - **Dimensions**: (leave empty)
    - **Row limit**: 1000 (or adjust as needed)
- **Customization** (Customize tab):
    - **Chart Orientation**: Horizontal (select "Horizontal" button)
    - **Chart Title**:
        - X Axis > Axis Title: "Total Revenue" (or custom label)
    - **Chart Options**:
        - **Show Value**: ✓ (checked - displays value labels on bars)
        - **Color Scheme**: Superset Colors (or preferred scheme)
        - **Show legend**: ✓ (checked)
        - **Truncate X Axis**: ✓ (checked - helps with long product names)
    - **Tooltip**:
        - **Rich tooltip**: ✓ (checked - shows detailed information on hover)
        - If dataset includes `categories` column, it will automatically appear in tooltip
- **Alternative**: Use Table with sparklines showing quantity trend over time

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

**Superset Visualization**:

- **Chart Type**: Treemap, Sunburst Chart, or Pie Chart
- **Treemap Configuration** (Recommended):
    - Dimension: `category_name`
    - Metric: `total_revenue_usd`
    - Show both percentage and absolute values
- **Sunburst Configuration**:
    - Great for hierarchical category structures
    - Interactive drill-down capability
- **Pie/Donut Configuration**:
    - Dimension: `category_name`
    - Metric: `total_revenue_usd`
    - Limit to top 10 categories for clarity

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

**Superset Visualization**:

- **Chart Type**: Table
- **Configuration**:
    - Display all columns for operational monitoring
    - Sort by `inventory` ascending (lowest stock first)
    - Format `price_usd` as currency: `$,.2f`
    - Format `inventory` as number: `,.0f`
- **Custom Conditional Formatting** (for visual alerts):
    - Column: `inventory`
        - Color scheme: `alert` (yellow/warning)
        - Operator: `<=`
        - Target value: `5`
    - Column: `inventory`
        - Color scheme: `error` (red)
        - Operator: `=`
        - Target value: `0`
- **Alternative Enhancement**:
    - Add calculated column for potential revenue:

    ```sql
    price_usd * inventory AS potential_value_usd
    ```

- **Dashboard Filters**: Add category filter at dashboard level for quick filtering

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

**Superset Visualization**:

- **Chart Type**: Mixed Chart (Recommended for dual metrics)
- **Configuration** (Data tab):
    - **Shared Query Fields**:
        - **X-axis**: `customer_segment`
    - **Query A** (LTV):
        - **Metrics**: `SUM(total_ltv_usd)`
        - **Series**: Bar
        - **Y Axis**: Primary (Left)
    - **Query B** (Customer Count):
        - **Metrics**: `SUM(customer_count)`
        - **Series**: Line
        - **Marker**: ✓ (checked)
        - **Y Axis**: Secondary (Right)
- **Customization** (Customize tab):
    - **Chart Title**:
        - **X Axis**:
            - **Axis Title**: "Customer Segment" or leave empty
        - **Y Axis (Left)**:
            - **Axis Title**: "Lifetime Value (USD)" or "Total LTV"
            - **Format**: `$,.0f` (currency)
        - **Y Axis (Right)**:
            - **Axis Title**: "Number of Customers"
            - **Format**: `,.0f` (number)
    - **Sort**: By `total_ltv_usd` descending
    - **Data labels**: Show `avg_ltv_usd` on bars (if supported)
    - **Legend**: Enable
- **Why Mixed Chart**: LTV values ($thousands) and customer counts have different scales
- **Dashboard Tip**: Combine with Pie Chart showing customer_count distribution by segment

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

**Superset Visualization**:

- **Chart Type**: Table
- **Configuration**:
    - Display all columns for detailed customer profiles
    - Sort by `lifetime_value_usd` descending
    - Format `lifetime_value_usd` as currency: `$,.2f`
    - Format dates as `YYYY-MM-DD`
- **Alternative**: Use Bar Chart (horizontal) to show top 20 customers visually with ranking by bar length

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

**Superset Visualization**:

- **Chart Type**: Mixed Chart (Recommended for dual metrics)
- **Configuration** (Data tab):
    - **Shared Query Fields**:
        - **X-axis**: `acquisition_month`
    - **Query A** (New Customers):
        - **Metrics**: `SUM(new_customers)`
        - **Series**: Line (or Bar)
        - **Area chart**: ✓ (optional - checked to show volume with fill)
        - **Y Axis**: Primary (Left)
    - **Query B** (Avg LTV):
        - **Metrics**: `AVG(avg_customer_ltv_usd)`
        - **Series**: Line
        - **Marker**: ✓ (checked - show monthly data points)
        - **Y Axis**: Secondary (Right)
- **Customization** (Customize tab):
    - **Chart Title**:
        - **X Axis**:
            - **Axis Title**: "Acquisition Month" or "Month"
        - **Y Axis (Left)**:
            - **Axis Title**: "New Customers" or "Customer Count"
            - **Format**: `,.0f` (number of customers)
        - **Y Axis (Right)**:
            - **Axis Title**: "Average Customer LTV (USD)"
            - **Format**: `$,.0f` (currency for LTV)
    - **Annotations**: Mark milestones or marketing campaigns
    - **Legend**: Enable
- **Why Mixed Chart**: Customer count and average LTV have different scales and units
- **Alternative**: Use Area Chart alone for `new_customers` if focusing on acquisition trend only

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

**Superset Visualization**:

- **Chart Type**: Pie Chart or Donut Chart
- **Configuration** (Data tab):
    - **Dimensions**: `status`
        - Click "Drop columns here or click"
        - Select `status`
    - **Metric**: `SUM(transaction_count)` (or `SUM(total_amount_usd)` for revenue view)
        - Click the metric area
        - Select Simple tab, column `transaction_count`, aggregate `SUM`
    - **Row limit**: 100
    - **Sort by metric**: ✓ (checked - sorts slices by size)
- **Customization** (Customize tab):
    - **Chart Options**:
        - **Color Scheme**: ECharts v5.x Colors (or preferred scheme)
        - **Percentage threshold**: 5 (hides slices smaller than 5%)
    - **Legend**:
        - **Show legend**: ✓ (checked)
        - **Orientation**: Top (or Right)
    - **Labels**:
        - **Label Type**: Select from:
            - `Category Name` (category name only)
            - `Category Name and Percentage` (recommended: shows name and percentage)
            - `Category Name, Percentage and Value` (most detailed: shows all information)
        - **Show Labels**: ✓ (checked)
        - **Put labels outside**: ✓ (checked - places labels outside the pie)
        - **Label Line**: ✓ (checked - draws lines from slices to labels)
        - **Show Total**: ✓ (checked - displays total in center)
    - **Pie shape** (for Donut Chart):
        - **Donut**: ✓ (checked - creates donut chart with hole in center)
        - Adjust **Inner Radius** slider to control hole size
- **Dashboard Tip**: Add Big Number card showing success rate % as KPI
- **Alert**: Set threshold alert if success rate drops below 95%

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

**Superset Visualization**:

- **Chart Type**: Line Chart
- **Configuration**:
    - X Axis: `date_day`
    - Metrics: `successful_transactions`, `failed_transactions`, `transaction_count`

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

**Superset Visualization**:

- **Chart Type**: Heatmap
- **Configuration**:
    - X Axis: `months_since_first` (0, 1, 2, 3...)
    - Y Axis: `cohort_month` (cohort grouping)
    - Metric: `retention_rate`
- **Customization**:
    - Show percentage values in cells
    - Sort cohorts by date descending (recent at top)
    - Color gradient: Use sequential color scheme (light to dark) for better readability
- **Use Case**: Compare many cohorts at once, get overall retention pattern at a glance across all cohorts
- **Dashboard Tip**: Place at top of dashboard for macro view, combine with line chart (Query 5.1.1) below for detailed trend analysis

### 5.1.1 Cohort Analysis - Recent N Cohorts (Retention Curve)

This query focuses on the most recent cohorts (configurable via `LIMIT N`) for detailed retention curve visualization. Use this for Line Chart to avoid cluttered visualization with too many cohort lines.

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
    GROUP BY cohort_month, months_since_first
),
recent_cohorts AS (
    SELECT DISTINCT cohort_month
    FROM cohort_data
    ORDER BY cohort_month DESC
    LIMIT 3  -- Change this number to get more/fewer cohorts (recommended: 3-6)
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
WHERE cohort_month IN (SELECT cohort_month FROM recent_cohorts)
ORDER BY cohort_month DESC, months_since_first ASC;
```

**Superset Visualization**:

- **Chart Type**: Line Chart
- **Configuration** (Data tab):
    - **X-axis**: `months_since_first` (0, 1, 2, 3...)
    - **Metrics**: `MAX(retention_rate)` or `AVG(retention_rate)`
        - Click "Drop columns/metrics here or click"
        - Select "Simple" tab
        - Column: `retention_rate`
        - Aggregate: `MAX` (or `AVG` - both work since retention_rate is pre-calculated)
    - **Dimensions**: `cohort_month` (creates separate line per cohort)
        - Click "Drop columns here or click"
        - Select `cohort_month`
    - **Contribution Mode**: None
- **Customization** (Customize tab):
    - **Y Axis**:
        - **Number format**: `,.1%` or `,.2%` (percentage display)
        - **Y Axis Bounds**: Min: 0, Max: 100 (fixed range for easier comparison across cohorts)
    - **Chart Options**:
        - **Show markers**: ✓ (checked - emphasize data points)
        - **Marker size**: Larger value for better visibility
        - **Line style**: Smooth or Linear (based on preference)
    - **Legend**:
        - **Show legend**: ✓ (checked - identify cohorts by color)
        - **Orientation**: Right or Top
- **Query Customization**:
    - Adjust `LIMIT 3` to `LIMIT 6` for more cohorts (recommended: 3-6 for readability)
    - For specific cohorts instead of recent N, replace the `recent_cohorts` CTE with:

        ```sql
        recent_cohorts AS (
            SELECT cohort_month FROM (VALUES
                ('2024-01'), ('2024-02'), ('2024-03')
            ) AS t(cohort_month)
        )
        ```

- **Use Case**:
    - Visualize retention curve shape and decay pattern
    - Compare retention performance across recent cohorts
    - Identify when customers typically churn (which month)
    - Measure impact of retention initiatives (compare before/after cohorts)
- **What to Look For**:
    - **Flat curve**: Strong retention, customers stay active over time (excellent)
    - **Steep initial drop then flat**: Normal ecommerce pattern, some customers become loyal
    - **Continuous steep drop**: Potential customer experience or product-market fit issues
    - **Cohorts trending upward**: Recent cohorts retaining better than older ones (positive signal)
- **Dashboard Tip**: Place below heatmap (Query 5.1) for drill-down analysis of recent cohort performance

### 5.2 RFM Analysis (Recency, Frequency, Monetary)

```sql
SELECT
    c.customer_name,
    c.customer_email,
    DATE_DIFF('day', CAST(c.last_order_date AS DATE), CURRENT_DATE) AS recency_days,
    c.total_orders AS frequency,
    ROUND(c.lifetime_value_usd, 2) AS monetary_usd,
    c.customer_segment
FROM ecommerce_marts.dim_customers c
WHERE c.total_orders > 0
ORDER BY monetary_usd DESC
LIMIT 20;
```

**Superset Visualization**:

- **Chart Type**: Bubble Chart or Table
- **Bubble Chart Configuration**:
    - Dimension: `customer_segment` (for segment grouping)
    - Entity: `customer_name`
    - X Axis: `recency_days`
    - Y Axis: `monetary_usd`
    - Bubble Size: `frequency`
- **Customization**:
    - Interactive tooltips showing customer details
    - Filter by segment for focused analysis
- **Table Configuration**:
    - Group by `customer_segment`
    - Show aggregate metrics: COUNT, AVG(monetary), AVG(recency)
- **Dashboard Tip**: Combine with Pie Chart showing segment distribution

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

**Superset Visualization**:

- **Chart Type**: Table
- **Configuration**:
    - Columns: `product_a`, `product_b`, `times_bought_together`, `frequency_percentage`
    - Sort by `times_bought_together` descending
    - Format `frequency_percentage` as percent: `,.2f%`
    - Format `times_bought_together` as number: `,.0f`
- **Dashboard Features**:
    - Enable table search for quick product lookup
    - Add filter for minimum frequency threshold
    - Export to CSV for recommendation engine integration
- **Use Case**: Product bundling, cross-sell recommendations, inventory planning

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

**Superset Visualization**:

- **Chart Type**: Table
- **Configuration**:
    - Display all columns: `metric`, `current_value`, `previous_value`, `growth_percentage`
    - Sort by `metric` to maintain consistent order
- **Customization**:
    - Format `current_value` and `previous_value`:
        - Currency format `$,.2f` for revenue metrics
        - Number format `,.0f` for count metrics
    - Format `growth_percentage` as percent: `,.2f%`
- **Dashboard Layout**: Place at top of dashboard as key metrics summary

## Superset Dashboard Recommendations

### Executive Dashboard

- **Key Metrics Summary**: Key metrics (Query 6.1) - Table showing current vs previous period
- **Revenue Trends**: Monthly revenue summary (Query 1.2) - Mixed Chart (bars + line)
- **Customer Overview**: Customer segmentation (Query 3.1) - Grouped Bar Chart
- **Category Mix**: Category performance (Query 2.2) - Treemap

### Product Performance Dashboard

- **Top Products**: Top 10 products (Query 2.1) - Horizontal Bar Chart
- **Category Breakdown**: Category performance (Query 2.2) - Sunburst Chart
- **Stock Alerts**: Low stock products (Query 2.3) - Table with conditional formatting
- **Cross-Sell Opportunities**: Product affinity (Query 5.3) - Table

### Customer Analytics Dashboard

- **Segment Distribution**: Customer segmentation (Query 3.1) - Pie Chart + Bar Chart combo
- **VIP Customers**: Top 20 by LTV (Query 3.2) - Table with highlights
- **Customer Behavior**: RFM analysis (Query 5.2) - Bubble Chart
- **Retention**: Cohort analysis (Query 5.1) - Heatmap

### Operations Dashboard

- **Daily Trends**: Daily sales trend (Query 1.1) - Line Chart with area fill
- **Payment Health**: Payment success rate (Query 4.1) - Donut Chart + Big Number KPI
- **Transaction Monitoring**: Transaction volume (Query 4.2) - Mixed Chart (stacked)
- **Pattern Analysis**: Weekend vs weekday (Query 1.3) - Bar Chart comparison

## Tips for Superset Visualization

### Dashboard Design

1. **Layout Hierarchy**: Place KPIs at top, detailed charts below
2. **Responsive Grid**: Use Superset's grid system for flexible layouts
3. **Tab Organization**: Group related charts in tabs for complex dashboards

### Chart Optimization

1. **Use Mixed Charts**: Combine chart types (line + bar) for richer insights with dual Y-axes
2. **Number Formatting**: Apply currency, percentage, and thousand separators to metrics
3. **Interactive Filters**: Add date range, category, and segment filters at dashboard level
4. **Drill-Through**: Configure chart click-through to detailed views (limited support)

### Performance

1. **Query Caching**: Enable result caching for frequently accessed charts
2. **Incremental Refresh**: Schedule regular cache warmup for dashboard load speed
3. **Limit Row Count**: Set reasonable limits (100-1000 rows) for table visualizations
4. **Async Queries**: Enable async query execution for long-running analyses

### Advanced Features

1. **Custom SQL**: Use SQL Lab for complex queries, then save as datasets
2. **Calculated Metrics**: Create virtual metrics (e.g., conversion rate, growth rate)
3. **Alerts**: Set up SQL-based alerts for anomalies (e.g., sudden drop in revenue)
4. **Annotations**: Add event markers to time series (e.g., marketing campaigns, holidays)
