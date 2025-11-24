# Ecommerce Analytics - Metabase Visualization Guide

This document provides guidance for creating visualizations in Metabase using the ecommerce star schema. For SQL queries and Superset-specific instructions, see [analysis_queries.md](./analysis_queries.md).

## Overview

Metabase provides a user-friendly interface for creating charts and dashboards. This guide focuses on Metabase-specific visualization techniques and workarounds for advanced analytics.

**Key Differences from Superset:**

- Simpler UI with fewer visualization options
- Limited conditional formatting (no color gradients)
- Better for operational reporting and sharing with non-technical users
- All charts use native SQL queries connected to Trino

## General Setup for All Charts

1. **Create New Question**:
   - Click "+ New" → "Question"
   - Select "Trino" as database
   - Choose "Native query" (SQL)

2. **Enter SQL Query**:
   - Paste the SQL query from the sections below
   - Use the ACE editor (if you have clicking issues, see [Best Practices](#metabase-best-practices) section)

3. **Execute and Visualize**:
   - Click "Get Answer" button (or Ctrl/Cmd + Enter)
   - Select appropriate visualization type from the "Visualization" button
   - Configure settings using the gear icon

4. **Save Question**:
   - Click "Save" button
   - Enter descriptive name matching the section title
   - Assign to appropriate collection (1. Sales Performance Analysis, 2. Product Analysis, etc.)

## 1. Sales Performance Analysis

### 1.1 Daily Sales Trend (Last 30 Days)

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Line
- **Configuration**:
    - Metabase automatically detects all three metrics (total_orders, total_revenue_usd, avg_order_value_usd) and plots them as separate lines
    - Click "Visualization" → Select "Line"
    - X-axis: `date_day` (automatically detected as temporal)
    - Y-axis: Multiple series displayed with dual axes
        - Left axis: Revenue metrics (total_revenue_usd, avg_order_value_usd)
        - Right axis: Order count (total_orders)
- **Customization** (via gear icon):
    - **Display**: Enable "Show dots on lines" for data point markers
    - **Axes**:
        - X-axis: Date formatting is automatic
        - Y-axis (Left): Format as currency
        - Y-axis (Right): Format as number
    - **Legend**: Position at top or right
    - **Series Settings**:
        - Click on series in legend to hide/show individual lines
        - Adjust line colors if needed

### 1.2 Monthly Revenue Summary

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Line and Bar (Combo)
- **Configuration**:
    - Click "Visualization" → Select "Line" → Click gear icon → "Display" → Check "Show values on data points" for bars
    - After selecting line chart, click gear icon to enable bar display for selected series
    - Metabase displays `total_revenue_usd` as bars (primary metric, higher values)
    - `total_orders` shown as line with markers (secondary metric)
    - X-axis: `year_month`
    - Dual Y-axes: Left for revenue (bars), Right for orders (line)
- **Customization**:
    - **Series**: Configure which metrics to show as bars vs lines
    - **Formatting**: Currency format for revenue, number format for orders
    - **Colors**: Green for revenue bars, blue for order line (default)

### 1.3 Weekend vs Weekday Sales

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Donut Chart (or Pie Chart)
- **Configuration**:
    - Click "Visualization" → Select "Pie" or "Donut"
    - Dimension: `period_type` (Weekday/Weekend)
    - Metric: `total_revenue_usd` (automatically selected)
    - Metabase shows percentages and total in center for donut chart
- **Customization**:
    - **Display**:
        - Enable "Show percentages" (default on)
        - Enable "Show legend"
        - "Show total" in center (for donut chart)
    - **Minimum slice**: Set to 0% to show all slices
    - Colors: Blue for Weekday, Green for Weekend (default)

**Alternative**: Use Row chart (horizontal bars) to compare multiple metrics side by side

## 2. Product Analysis

### 2.1 Top 10 Best Selling Products

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Bar Chart (Horizontal)
- **Configuration**:
    - Click "Visualization" → Select "Bar" → Click gear icon → "Display" → Select "Horizontal"
    - Y-axis: `product_name` (automatically sorted by total_revenue_usd due to ORDER BY in SQL)
    - X-axis: `total_revenue_usd`
    - Bars display product names on left, revenue values on right
- **Customization**:
    - **Display**:
        - Enable "Show values" to display revenue numbers on bars
        - Bar color: Single color (blue default)
    - **Axes**:
        - X-axis: Format as currency ($,.0f)
        - Y-axis: Product names (automatically truncated if too long)
    - **Tooltip**: Hover shows all metrics including categories

### 2.2 Category Performance

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Pie Chart or Donut Chart
- **Configuration**:
    - Click "Visualization" → Select "Pie" or "Donut"
    - Dimension: `category_name`
    - Metric: `total_revenue_usd`
    - Displays percentage breakdown with legend
- **Customization**:
    - **Display**:
        - Show percentages on slices
        - Show legend with category names
        - Show total in center (donut only)
    - **Minimum slice**: Set threshold (e.g., 2%) to group small categories as "Other"
    - Colors: Automatic color assignment per category

**Alternative**: Use Row chart for easier comparison of exact values

### 2.3 Inventory Alert - Low Stock Products

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Table
- **Configuration**:
    - Click "Visualization" → Select "Table"
    - All columns display by default
    - Sorted by inventory (ascending) per SQL ORDER BY
- **Customization**:
    - **Formatting** (click column headers):
        - `inventory`: Number format (,.0f)
        - `price_usd`: Currency format ($,.2f)
        - `is_low_stock`, `is_in_stock`: Boolean (checkmark/x)
    - **Conditional Formatting** (limited in Metabase):
        - Can highlight rows based on single conditions
        - Example: Highlight `inventory` < 5 in yellow
    - **Columns**: Reorder by dragging column headers
    - Enable "Expand" button for full-screen table view

## 3. Customer Analysis

### 3.1 Customer Segmentation Overview

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Line and Bar Combo (or separate charts)
- **Configuration**:
    - Primary metric: `total_ltv_usd` (bar)
    - Secondary metric: `customer_count` (line with markers)
    - X-axis: `customer_segment`
    - Dual Y-axes for different scales
- **Customization**:
    - Format LTV as currency, customer count as number
    - Sort by total_ltv_usd descending (already in SQL)
    - Enable data labels on bars for exact values

**Alternative**: Use two separate visualizations - one bar chart for LTV, one for customer distribution

### 3.2 Top 20 Customers by Lifetime Value

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Table
- **Configuration**:
    - All columns displayed
    - Sorted by `lifetime_value_usd` descending (per SQL)
    - Good for detailed customer profiles and operational use
- **Customization**:
    - **Formatting**:
        - `lifetime_value_usd`: Currency format
        - `total_orders`, `customer_lifetime_days`: Number format
        - `first_order_date`, `last_order_date`: Date format (YYYY-MM-DD)
    - **Columns**: Show/hide columns as needed
    - Enable row expansion for detailed view

**Alternative**: Horizontal bar chart showing top 20 by LTV (simpler visual ranking)

### 3.3 Customer Acquisition by Month

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Line and Bar Combo
- **Configuration**:
    - Primary: `new_customers` (area chart or bars)
    - Secondary: `avg_customer_ltv_usd` (line with markers)
    - X-axis: `acquisition_month`
    - Shows customer acquisition trend with quality (LTV) overlay
- **Customization**:
    - Format new_customers as number, avg_customer_ltv_usd as currency
    - Enable area fill for new_customers to emphasize volume
    - Dual Y-axes for different scales

## 4. Transaction & Payment Analysis

### 4.1 Payment Success Rate

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Donut Chart (or Pie Chart)
- **Configuration**:
    - Dimension: `status` (succeeded, failed, pending, etc.)
    - Metric: `transaction_count` (or `total_amount_usd` for revenue view)
    - Displays success/failure rates as percentages
    - Total shown in center (donut chart)
- **Customization**:
    - **Display**:
        - Show percentages on slices
        - Show legend with status labels
        - Color: Green for succeeded, red for failed, gray for pending
    - Use transaction_count for volume view or total_amount_usd for revenue impact view

**Dashboard Tip**: Add a "Big Number" card showing success rate % as KPI

### 4.2 Daily Transaction Volume

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Line Chart (Multi-series)
- **Configuration**:
    - X-axis: `date_day`
    - Y-axis: Multiple metrics as separate lines
        - `successful_transactions` (green line)
        - `failed_transactions` (red line)
        - `transaction_count` (blue line)
    - Markers on data points
- **Customization**:
    - Enable legend to identify series
    - Format Y-axis as number (,.0f)
    - Show dots on lines for daily data points
    - Consider using stacked area chart to show composition

## 5. Advanced Analytics

### 5.1 Cohort Analysis - Customer Retention (Pivot Table)

This approach uses SQL-level pivoting to transform cohort retention data into a matrix format suitable for heatmap-style analysis in Metabase.

**Note**: This query differs from the one in [analysis_queries.md](./analysis_queries.md). The original query returns data in long format (one row per cohort per month), which is ideal for Superset's heatmap. This Metabase version uses SQL pivoting with CASE statements to transform the data into wide format (one row per cohort with months as columns), creating a table that's easier to read in Metabase.

**Why Pivot Table Approach:**

- Metabase's native Pivot Table visualization requires aggregated queries and doesn't work well with pre-calculated retention rates
- SQL-level pivoting provides better control over data transformation
- Results in a clean table structure where cohorts are rows and months are columns
- Easy to read horizontally: each row shows one cohort's retention journey over time

**SQL Query:**

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
        COUNT(DISTINCT customer_id) AS active_customers,
        FIRST_VALUE(COUNT(DISTINCT customer_id)) OVER (PARTITION BY cohort_month ORDER BY months_since_first) AS cohort_size
    FROM cohort_orders
    WHERE cohort_month >= DATE_FORMAT(CURRENT_DATE - INTERVAL '12' MONTH, '%Y-%m')
    GROUP BY cohort_month, months_since_first
)
SELECT
    cohort_month,
    ROUND(MAX(CASE WHEN months_since_first = 0 THEN active_customers * 100.0 / cohort_size END), 2) AS "Month 0",
    ROUND(MAX(CASE WHEN months_since_first = 1 THEN active_customers * 100.0 / cohort_size END), 2) AS "Month 1",
    ROUND(MAX(CASE WHEN months_since_first = 2 THEN active_customers * 100.0 / cohort_size END), 2) AS "Month 2",
    ROUND(MAX(CASE WHEN months_since_first = 3 THEN active_customers * 100.0 / cohort_size END), 2) AS "Month 3",
    ROUND(MAX(CASE WHEN months_since_first = 4 THEN active_customers * 100.0 / cohort_size END), 2) AS "Month 4"
FROM cohort_data
GROUP BY cohort_month
ORDER BY cohort_month ASC;
```

**Metabase Setup Instructions:**

1. **Create New Question**:
   - Click "+ New" → "Question"
   - Select "Trino" as database
   - Choose "Native query" (SQL)

2. **Enter SQL Query**:
   - Click into the SQL editor area
   - Paste the complete query above
   - Note: If you have trouble clicking the editor, you may need to use the browser console to access the ACE editor:

     ```javascript
     window.ace.edit(document.querySelector('.ace_editor')).setValue(`[YOUR SQL QUERY]`)
     ```

3. **Execute Query**:
   - Click "Get Answer" button (or press Ctrl/Cmd + Enter)
   - Query should return rows with columns: `cohort_month`, `Month 0`, `Month 1`, `Month 2`, `Month 3`, `Month 4`

4. **Switch to Table Visualization**:
   - Click the "Visualization" button at bottom-left
   - Select "Table" from visualization options
   - The pivot table structure should display clearly with cohorts as rows and months as columns

5. **Customize Table (Optional)**:
   - **Column Formatting**: Click column headers to adjust number formatting if needed
   - **Row Ordering**: The query uses `ORDER BY cohort_month ASC` to show oldest cohorts first (top to bottom)
     - To reverse order (newest first), change to `ORDER BY cohort_month DESC`
   - **Conditional Formatting**:
     - Click "Formatting" in visualization settings
     - Note: Metabase's conditional formatting only supports single condition rules (=, >, <), not color gradients
     - You can add rules like "if value > 50, highlight green" but not a full heatmap gradient effect

6. **Save Question**:
   - Click "Save" button
   - Enter descriptive name: "5.1 Cohort Analysis - Customer Retention (Pivot)"
   - Add to dashboard if desired

**Interpreting Results:**

Each row represents one customer cohort (customers who made their first purchase in that month):

- **cohort_month**: The month when customers made their first purchase
- **Month 0**: Always 100% (baseline - all customers made at least one purchase)
- **Month 1-4**: Percentage of customers who made another purchase N months after first purchase

**Example Data:**

| cohort_month | Month 0 | Month 1 | Month 2 | Month 3 | Month 4 |
|--------------|---------|---------|---------|---------|---------|
| 2025-07      | 100     | 38.74   | 53.15   | 19.82   | -       |
| 2025-08      | 100     | 39.87   | 27.85   | -       | -       |
| 2025-09      | 100     | 33.98   | -       | -       | -       |
| 2025-10      | 100     | -       | -       | -       | -       |
| 2025-11      | 100     | -       | -       | -       | -       |

**What to Look For:**

- **High retention (>40% in Month 1-2)**: Customers find value and return
- **Low retention (<20% in Month 1-2)**: May indicate poor product-market fit or customer experience issues
- **Increasing retention across recent cohorts**: Product/experience improvements are working
- **Empty cells (NULL values)**: Cohort hasn't aged enough for that month's data yet

**Limitations:**

- **No Color Gradient**: Unlike Superset's heatmap, Metabase tables don't support color range/gradient conditional formatting
- **Manual Column Addition**: When adding more months of data, you need to manually add more CASE WHEN statements to the SQL query
- **Static Pivot**: The number of month columns is fixed in the query (Month 0-4 in this example)

**Query Customization:**

- **Add More Months**: Add additional CASE statements for Month 5, 6, etc.:

  ```sql
  ROUND(MAX(CASE WHEN months_since_first = 5 THEN active_customers * 100.0 / cohort_size END), 2) AS "Month 5"
  ```

- **Change Time Window**: Modify the WHERE clause to look at different cohort ranges:

  ```sql
  WHERE cohort_month >= DATE_FORMAT(CURRENT_DATE - INTERVAL '6' MONTH, '%Y-%m')  -- Last 6 months
  ```

- **Filter by Segment**: Add customer segment filtering by joining with dim_customers:

  ```sql
  JOIN ecommerce_marts.dim_customers c ON o.customer_id = c.customer_id
  WHERE c.customer_segment = 'VIP'
  ```

**Dashboard Tips:**

- Place this pivot table at the top of your retention dashboard for quick overview
- Combine with a line chart (5.1.1 from analysis_queries.md) showing retention curves for detailed trend analysis
- Add filters for cohort date range and customer segment at dashboard level

**Comparison with Superset:**

- **Superset Heatmap**: Better for visual pattern recognition with color gradients, supports many cohorts at once
- **Metabase Pivot Table**: Better for precise number reading and comparison, clearer horizontal layout
- **Use Both**: Use Superset for exploration and pattern discovery, Metabase for operational reporting and sharing with non-technical users

### 5.2 RFM Analysis (Recency, Frequency, Monetary)

**Note**: While Superset offers bubble charts ideal for plotting Recency vs Monetary with Frequency as bubble size and segment color, Metabase's visualization options are more limited. However, we can create effective RFM analysis using **RFM Score Segmentation** approach.

#### Approach 1: RFM Score Segmentation (Recommended)

This approach pre-calculates RFM scores (quintiles) in SQL and creates customer segments, making visualization straightforward with bar/pie charts.

**SQL Query:**

```sql
WITH rfm_base AS (
    SELECT
        c.customer_name,
        c.customer_email,
        DATE_DIFF('day', CAST(c.last_order_date AS DATE), CURRENT_DATE) AS recency_days,
        c.total_orders AS frequency,
        ROUND(c.lifetime_value_usd, 2) AS monetary_usd,
        c.customer_segment
    FROM ecommerce_marts.dim_customers c
    WHERE c.total_orders > 0
),
rfm_percentiles AS (
    SELECT
        *,
        -- Recency: Lower is better, so we invert the score
        CASE
            WHEN recency_days <= 30 THEN 5
            WHEN recency_days <= 60 THEN 4
            WHEN recency_days <= 90 THEN 3
            WHEN recency_days <= 180 THEN 2
            ELSE 1
        END AS r_score,
        -- Frequency: Higher is better
        CASE
            WHEN frequency >= 10 THEN 5
            WHEN frequency >= 7 THEN 4
            WHEN frequency >= 4 THEN 3
            WHEN frequency >= 2 THEN 2
            ELSE 1
        END AS f_score,
        -- Monetary: Higher is better
        CASE
            WHEN monetary_usd >= 5000 THEN 5
            WHEN monetary_usd >= 2000 THEN 4
            WHEN monetary_usd >= 1000 THEN 3
            WHEN monetary_usd >= 500 THEN 2
            ELSE 1
        END AS m_score
    FROM rfm_base
)
SELECT
    customer_name,
    customer_email,
    recency_days,
    frequency,
    monetary_usd,
    r_score,
    f_score,
    m_score,
    CONCAT(CAST(r_score AS VARCHAR), CAST(f_score AS VARCHAR), CAST(m_score AS VARCHAR)) AS rfm_code,
    CASE
        WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
        WHEN r_score >= 3 AND f_score >= 3 AND m_score >= 3 THEN 'Loyal Customers'
        WHEN r_score >= 4 AND f_score <= 2 AND m_score <= 2 THEN 'New Customers'
        WHEN r_score <= 2 AND f_score >= 3 AND m_score >= 3 THEN 'At Risk'
        WHEN r_score <= 2 AND f_score <= 2 AND m_score >= 3 THEN 'Cant Lose Them'
        WHEN r_score <= 2 AND f_score <= 2 AND m_score <= 2 THEN 'Lost'
        WHEN r_score >= 3 AND f_score <= 2 AND m_score <= 2 THEN 'Promising'
        WHEN r_score >= 3 AND m_score >= 3 THEN 'Potential Loyalists'
        ELSE 'Others'
    END AS rfm_segment,
    customer_segment AS original_segment
FROM rfm_percentiles
ORDER BY r_score DESC, f_score DESC, m_score DESC;
```

**Metabase Visualizations:**

#### Chart 1: RFM Segment Distribution (Pie/Donut Chart)

```sql
-- Aggregate by RFM segment
WITH rfm_base AS (
    -- [Same CTE as above]
),
rfm_percentiles AS (
    -- [Same CTE as above]
),
rfm_segments AS (
    -- [Same SELECT as above]
)
SELECT
    rfm_segment,
    COUNT(*) AS customer_count,
    ROUND(SUM(monetary_usd), 2) AS total_value_usd,
    ROUND(AVG(monetary_usd), 2) AS avg_value_usd,
    ROUND(AVG(CAST(recency_days AS DOUBLE)), 2) AS avg_recency_days,
    ROUND(AVG(CAST(frequency AS DOUBLE)), 2) AS avg_frequency
FROM rfm_segments
GROUP BY rfm_segment
ORDER BY total_value_usd DESC;
```

- **Chart Type**: Donut Chart or Horizontal Bar Chart
- **Configuration**:
    - Dimension: `rfm_segment`
    - Metric: `customer_count` or `total_value_usd`
    - Shows distribution of customers across RFM segments
- **Use Case**: Quick overview of customer base composition

#### Chart 2: RFM Segment Value (Bar Chart)

- **Chart Type**: Horizontal Bar Chart
- **Configuration**:
    - Y-axis: `rfm_segment`
    - X-axis: `total_value_usd`
    - Sort by total value descending
- **Use Case**: Identify which segments contribute most revenue

#### Chart 3: Segment Performance Matrix (Table with Conditional Formatting)

- **Chart Type**: Table
- **Configuration**:
    - Display all columns: segment, count, total_value, avg_value, avg_recency, avg_frequency
    - Conditional formatting on `avg_recency_days` (green for low, red for high)
    - Conditional formatting on `avg_value_usd` (green for high, red for low)
- **Use Case**: Detailed segment analysis for operational decisions

#### Approach 2: Individual Customer Table with Visual Indicators

For detailed customer-level analysis:

**SQL Query:**

```sql
-- Use the same RFM scoring query from Approach 1
-- Display individual customers with their scores and segments
```

**Metabase Visualization:**

- **Chart Type**: Table
- **Configuration**:
    - Columns: customer_name, recency_days, frequency, monetary_usd, r_score, f_score, m_score, rfm_segment
    - Conditional formatting:
        - `r_score`, `f_score`, `m_score`: Color scale (red=1 → green=5)
        - `rfm_segment`: Different colors per segment type
    - Enable search/filter for finding specific customers
- **Use Case**: Customer-level operational work, targeted marketing campaigns

#### Approach 3: Multiple Focused Charts Dashboard

Create separate focused visualizations for each dimension:

#### Chart A: Recency Distribution (Bar Chart)

```sql
SELECT
    CASE
        WHEN recency_days <= 30 THEN '0-30 days'
        WHEN recency_days <= 60 THEN '31-60 days'
        WHEN recency_days <= 90 THEN '61-90 days'
        WHEN recency_days <= 180 THEN '91-180 days'
        ELSE '180+ days'
    END AS recency_bucket,
    COUNT(*) AS customer_count,
    ROUND(SUM(lifetime_value_usd), 2) AS total_value_usd
FROM ecommerce_marts.dim_customers
WHERE total_orders > 0
GROUP BY 1
ORDER BY MIN(recency_days);
```

#### Chart B: Frequency Distribution (Bar Chart)

```sql
SELECT
    CASE
        WHEN total_orders >= 10 THEN '10+ orders'
        WHEN total_orders >= 7 THEN '7-9 orders'
        WHEN total_orders >= 4 THEN '4-6 orders'
        WHEN total_orders >= 2 THEN '2-3 orders'
        ELSE '1 order'
    END AS frequency_bucket,
    COUNT(*) AS customer_count,
    ROUND(SUM(lifetime_value_usd), 2) AS total_value_usd
FROM ecommerce_marts.dim_customers
WHERE total_orders > 0
GROUP BY 1
ORDER BY MIN(total_orders) DESC;
```

#### Chart C: Monetary Distribution (Bar Chart)

```sql
SELECT
    CASE
        WHEN lifetime_value_usd >= 5000 THEN '$5000+'
        WHEN lifetime_value_usd >= 2000 THEN '$2000-4999'
        WHEN lifetime_value_usd >= 1000 THEN '$1000-1999'
        WHEN lifetime_value_usd >= 500 THEN '$500-999'
        ELSE '$0-499'
    END AS monetary_bucket,
    COUNT(*) AS customer_count,
    ROUND(SUM(lifetime_value_usd), 2) AS total_value_usd
FROM ecommerce_marts.dim_customers
WHERE total_orders > 0
GROUP BY 1
ORDER BY MIN(lifetime_value_usd) DESC;
```

- Place these three charts side by side in a dashboard
- Shows distribution across each RFM dimension independently
- Easier to spot trends in each dimension

**Recommended Approach**: Use **Approach 1 (RFM Score Segmentation)** for Metabase. This provides:

1. Clear, actionable customer segments (Champions, At Risk, Lost, etc.)
2. Easy-to-understand visualizations (pie/bar charts)
3. Operational value for marketing teams
4. Better alignment with business terminology vs. raw RFM scores

**Comparison with Superset:**

- **Superset Bubble Chart**: Best for exploratory analysis, seeing correlations between R, F, M
- **Metabase RFM Segmentation**: Best for operational dashboards, actionable segments, sharing with non-technical users
- **Use Both**: Use Superset for initial RFM analysis and segment definition, then use Metabase for ongoing monitoring and reporting

## 6. Key Metrics Queries

### 6.1 Key Metrics Summary (Last 30 Days)

**SQL Query:**

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

**Metabase Visualization:**

- **Chart Type**: Table
- **Configuration**:
    - Displays all 4 key metrics with period-over-period comparison
    - Columns: `metric`, `current_value`, `previous_value`, `growth_percentage`
    - Clean, dashboard-ready format for KPI monitoring
- **Customization**:
    - **Formatting** (click column headers):
        - `current_value` and `previous_value`:
            - For "Total Orders" and "Unique Customers": Number format (,.0f)
            - For revenue metrics: Currency format ($,.2f)
        - `growth_percentage`: Number format with 2 decimals, manually add "%" suffix interpretation
    - **Conditional Formatting**:
        - Highlight positive growth (green) and negative growth (red) in `growth_percentage` column
        - Example rules:
            - If `growth_percentage` > 0, color green
            - If `growth_percentage` < 0, color red
    - **Layout**: Ideal for dashboard header showing current business performance at a glance

**Dashboard Tips:**

- Place this table at the top of executive dashboards
- Pair with trend charts (1.1, 1.2) for detailed time-series analysis
- Consider creating separate "Big Number" cards for each metric for larger KPI displays

## Metabase Best Practices

### Working with Native SQL Queries

1. **ACE Editor Issues**: Metabase's SQL editor uses ACE editor which can sometimes have clicking issues. If you cannot click into the editor:
   - Open browser console (F12)
   - Use JavaScript to access the editor: `window.ace.edit(document.querySelector('.ace_editor'))`
   - Set query content: `.setValue('YOUR SQL HERE')`

2. **Query Performance**:
   - Test queries in SQL Lab first before creating visualizations
   - Use LIMIT clauses during development
   - Monitor query execution time (displayed after "Get Answer")

3. **Reusable Queries**:
   - Save complex queries as "Questions" for reuse
   - Create models (saved questions) that other users can query without SQL knowledge

### Table Visualizations

1. **Column Formatting**: Click column headers to adjust:
   - Number format (decimals, thousands separator)
   - Currency format ($, €, etc.)
   - Percentage format (%)

2. **Conditional Formatting**:
   - Limited to single condition rules (not color ranges)
   - Good for highlighting outliers or thresholds
   - Examples: "if > 50 then green", "if < 20 then red"

3. **Sorting**:
   - Default sort can be set in SQL (ORDER BY clause)
   - Users can click column headers to re-sort interactively

### Dashboard Design

1. **Layout**: Use Metabase's grid system to arrange charts
2. **Filters**: Add dashboard-level filters for date ranges, categories, segments
3. **Refresh Schedule**: Set up automatic refresh for cached results
4. **Sharing**: Generate public links or embed dashboards in other applications

## Additional Resources

- **SQL Queries**: See [analysis_queries.md](./analysis_queries.md) for complete query library
- **Superset Visualizations**: See analysis_queries.md for Superset-specific chart configurations
- **Metabase Documentation**: See [docs/metabase.md](./metabase.md) for general Metabase usage
