# Metabase Integration Guide

This document provides guidance for working with Metabase, the BI tool used for querying and visualizing data from the lakehouse.

## Overview

Metabase is an open-source business intelligence tool that connects to the Trino query engine, providing access to:

- Iceberg tables transformed by dbt (star schema with fact and dimension tables)
- Raw data ingested by dlt from Payload CMS
- Interactive query building with aggregations, filters, and visualizations

**Metabase URL**: `https://metabase.example.com` (replace with your actual domain)

## Core Concepts

### Questions

Questions are saved queries in Metabase that can be:

- Built interactively using the visual query builder
- Saved and shared with team members
- Added to dashboards for comprehensive analytics
- Exported in various formats (CSV, JSON, etc.)

### Collections

Collections are folders for organizing Questions and Dashboards. You can create collections to organize your analytical queries by business domain, team, or use case.

For example SQL queries that can be turned into Questions, see [`docs/analysis_queries.md`](../docs/analysis_queries.md).

## Creating Analytical Questions

### Example: Monthly Sales and Order Count

This example demonstrates creating a meaningful analytical Question that aggregates order data by month.

**Objective**: Track monthly sales revenue and order volume trends over time.

**Steps**:

1. **Navigate to Question Builder**:
   - Direct URL: `https://metabase.example.com/question/new`
   - Or click "+ New" → "Question" in the navigation bar

2. **Select Data Source**:
   - Choose "Fact Orders" from the data picker
   - Data source: Trino database → Ecommerce Marts schema → Fact Orders table

3. **Add Aggregations**:
   - Click "Summarize" button to open aggregation panel
   - Default aggregation is "Count" (order count)
   - Click "Add aggregation" to add more metrics
   - Select "Sum of ..." → "Amount Usd" to calculate total revenue

4. **Configure Grouping**:
   - In the "Group by" section, find "Order Date"
   - Click the temporal bucket dropdown (default: "by week")
   - Select "Month" to group by month
   - Click "Add dimension" to apply the grouping

5. **Review Visualization**:
   - Metabase automatically creates a line chart
   - Two metrics displayed:
     - Blue line: Count (number of orders)
     - Orange line: Sum of Amount Usd (total revenue)
   - X-axis: Order Date grouped by month
   - Y-axis: Dual scales for count and revenue

6. **Save Question**:
   - Click "Save" button
   - Enter name: "Monthly Sales and Order Count"
   - Choose collection: "Our analytics"
   - Click "Save"

**Result**:

- URL: `https://metabase.example.com/question/45-monthly-sales-and-order-count`
- Query execution time: ~230-300ms
- Data: Monthly trends from July 2025 onwards
- Visualization: Line chart showing correlation between order volume and revenue

## Working with Models

### What are Models?

Models in Metabase are curated datasets that encapsulate business logic and can be reused across multiple Questions. They serve as a semantic layer between raw tables and end-user queries, enabling analysts to:

- Create reusable business metrics without data engineering support
- Define customer segments, cohorts, and derived features
- Abstract complex SQL logic into simple, queryable datasets
- Maintain consistent business definitions across the organization

**Key Benefits:**

- **Self-Service Analytics**: Analysts can create and manage their own feature sets
- **Consistency**: One source of truth for business logic (e.g., "Active Customer" definition)
- **Performance**: Models can be cached or materialized for faster queries
- **Collaboration**: Models appear in the data picker alongside tables, making them discoverable

### Creating Models

#### Example 1: Active Customers Model (Notebook Editor)

**Use Case**: Marketing team needs to identify customers who made purchases in the last 90 days for a retention campaign.

**Steps**:

1. Navigate to "+ New" → "Model" → "Use the notebook editor"
2. **Select Data**: Choose "Fact Orders" table from Ecommerce Marts schema
3. **Add Filters**:
    - Click the "+" button in the Filter section → Select "Status" → Select "completed"
    - Click the "+" button again → Select "Order Date" → Click "Relative dates…"
    - In the "Previous" tab:
      - Change Interval from "30" to "90"
      - Keep Unit as "days"
      - Click "Add filter"
4. **Summarize**:
    - Click "Pick a function or metric" → Select "Number of distinct values of ..." → Select "Customer ID"
    - Click the "+" button next to the aggregation → Select "Sum of ..." → Select "Amount Usd"
5. **Group By**:
    - Click "Pick a column to group by" → Select "Customer ID"
    - **Important**: By default, Customer ID will be "Auto binned" (grouped into ranges like 0-20, 20-40)
    - To group by individual Customer IDs: Click "Customer ID: Auto binned" button → Click the "Binning strategy" dropdown (showing "Auto binned") → Select "Don't bin"
    - Click "Get Answer" to preview the updated results
6. **Save as Model**:
    - Click "Save" button (top right)
    - Enter name: "Active Customers (90 Days)"
    - Choose collection: "Our analytics" (or your preferred collection)
    - Click "Save"

**Result**: A model showing:

- Customer ID (individual customer IDs, not binned)
- Distinct values of Customer ID (count of distinct customers per ID, typically 1)
- Sum of Amount Usd (total revenue per customer)

**Who Can Use This**: Anyone comfortable with Metabase's visual query builder (no SQL required).

**Practical Use Cases**:

1. **VIP Customer Identification**:
   - Create a new Question from this Model
   - Add filter: `Sum of Amount Usd > 5000`
   - Sort by `Sum of Amount Usd` descending
   - Export the list for personalized outreach or exclusive offers
   - **Business Value**: Target high-value customers with premium services or loyalty rewards

2. **Customer Segmentation for Marketing Campaigns**:
   - Use this Model as a base to create segments:
     - **High Spenders**: Sum of Amount Usd > $2,000
     - **Medium Spenders**: Sum of Amount Usd between $500-$2,000
     - **Low Spenders**: Sum of Amount Usd < $500
   - Create different email campaigns for each segment
   - **Business Value**: Increase conversion rates with targeted messaging

3. **Active Customer Health Monitoring**:
   - Add this Model to a dashboard
   - Create a trend chart showing count of active customers over time (by refreshing the Model weekly)
   - Set up alerts when active customer count drops below threshold
   - **Business Value**: Early detection of customer engagement issues

4. **Cross-Sell and Upsell Opportunities**:
   - Join this Model with product purchase history (from `fact_order_items`)
   - Identify customers who haven't purchased specific product categories
   - **Business Value**: Targeted product recommendations based on spending capacity

5. **Churn Prevention Analysis**:
   - Compare customers in this Model (active last 90 days) with all customers
   - Identify customers who were active 90-180 days ago but not in last 90 days
   - Create a re-engagement campaign for at-risk customers
   - **Business Value**: Reduce customer churn through proactive outreach

6. **Sales Team Prioritization**:
   - Share this Model with sales team to focus on high-potential accounts
   - Sort by `Sum of Amount Usd` to prioritize outreach
   - **Business Value**: Maximize ROI of sales team efforts by focusing on proven buyers

#### Example 2: Customer Lifetime Value Model (Native Query)

**Use Case**: Business analysts need comprehensive customer metrics including segmentation and engagement status for advanced analytics.

**Steps**:

1. Navigate to "+ New" → "Model" → "Use a native query"
2. Enter the following SQL:

```sql
SELECT
  c.customer_id,
  c.email,
  c.created_at as customer_since,
  COUNT(DISTINCT o.order_id) as total_orders,
  SUM(o.amount_usd) as lifetime_value,
  AVG(o.amount_usd) as avg_order_value,
  MIN(o.order_date) as first_order_date,
  MAX(o.order_date) as last_order_date,
  DATE_DIFF('day', MAX(o.order_date), CURRENT_DATE) as days_since_last_order,
  CASE
    WHEN COUNT(DISTINCT o.order_id) = 1 THEN 'One-time'
    WHEN COUNT(DISTINCT o.order_id) BETWEEN 2 AND 5 THEN 'Regular'
    WHEN COUNT(DISTINCT o.order_id) > 5 THEN 'Loyal'
  END as customer_segment,
  CASE
    WHEN DATE_DIFF('day', MAX(o.order_date), CURRENT_DATE) > 90 THEN 'At Risk'
    WHEN DATE_DIFF('day', MAX(o.order_date), CURRENT_DATE) > 30 THEN 'Inactive'
    ELSE 'Active'
  END as engagement_status
FROM iceberg.ecommerce_marts.dim_customers c
LEFT JOIN iceberg.ecommerce_marts.fact_orders o
  ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.customer_id, c.email, c.created_at
```

3. **Save as Model**: Name it "Customer Lifetime Value"

**Result**: A rich customer dataset with:

- Order frequency and recency metrics
- Calculated segments (One-time, Regular, Loyal)
- Engagement status (Active, Inactive, At Risk)

**Who Can Use This**: Analysts comfortable with SQL and Trino query syntax.

**Use Cases**:

- Marketing: Target "Loyal" customers for referral programs
- Sales: Prioritize "At Risk" high-value customers for outreach
- Executive Dashboards: Track customer segment distribution over time
- Predictive Analytics: Export features for churn prediction models

### Using Models

Once a Model is created, it appears in the data picker alongside regular tables:

1. **Creating Questions from Models**:
   - Navigate to "+ New" → "Question"
   - In the data picker, Models appear under a "Models" tab
   - Select your Model (e.g., "Customer Lifetime Value")
   - Add filters, aggregations, and visualizations as needed

2. **Joining Models with Other Data**:
   - Models can be joined with other tables or Models
   - Example: Join "Customer Lifetime Value" with "Dim Products" to analyze product preferences by customer segment

3. **Building on Models**:
   - Create derived Questions that filter or aggregate Model data
   - Example: "Top 10 Loyal Customers by Revenue" built from CLV Model

### Best Practices

**When to Create a Model:**

1. **Reusable Business Logic**: When the same calculation appears in multiple Questions
2. **Complex Transformations**: When SQL logic is too complex for notebook editor
3. **Standardized Definitions**: When business terms need consistent implementation (e.g., "Active Customer")
4. **Performance Optimization**: When queries are slow and can benefit from caching

**When NOT to Create a Model:**

1. **One-off Queries**: Simple, single-use Questions don't need Models
2. **Raw Exploration**: Initial data discovery is better done with direct table queries
3. **Frequently Changing Logic**: If business rules change weekly, maintain flexibility with Questions

**Naming Conventions:**

- Use descriptive, business-friendly names: "Customer Lifetime Value" not "customer_metrics_v2"
- Include time ranges if applicable: "Active Customers (90 Days)"
- Prefix by domain if needed: "Marketing: Email Campaign Performance"

**Model vs. dbt Model:**

- **dbt Models**: For transformation logic that all users need, version-controlled in code
- **Metabase Models**: For analyst-specific views, rapid iteration, and self-service features
- **Best Practice**: Use dbt for core dimensional models, Metabase Models for flexible analytical views

## Available Data Sources

### Ecommerce Marts (Star Schema)

Analytical tables optimized for reporting:

**Dimension Tables**:

- `dim_categories`: Product category hierarchy
- `dim_customers`: Customer master data
- `dim_date`: Date dimension for time-based analysis
- `dim_products`: Product master data

**Fact Tables**:

- `fact_orders`: Order-level transactions
- `fact_order_items`: Line-item level detail
- `fact_transactions`: Payment transactions

**Bridge Tables**:

- `bridge_product_categories`: Many-to-many product-category relationships

### Common Query Patterns

**Time-Series Analysis**:

```sql
-- Monthly revenue trend
SELECT
  DATE_TRUNC('month', order_date) AS month,
  SUM(amount_usd) AS revenue,
  COUNT(*) AS order_count
FROM fact_orders
WHERE status = 'completed'
GROUP BY 1
ORDER BY 1 DESC
```

**Product Performance**:

```sql
-- Top selling products
SELECT
  p.title,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.total_usd) AS revenue
FROM fact_order_items oi
JOIN dim_products p ON oi.product_id = p.product_id
GROUP BY 1
ORDER BY 3 DESC
LIMIT 10
```

**Customer Segmentation**:

```sql
-- Customer order frequency
SELECT
  customer_id,
  COUNT(*) AS order_count,
  SUM(amount_usd) AS lifetime_value
FROM fact_orders
WHERE status = 'completed'
GROUP BY 1
HAVING COUNT(*) > 1
```

## Best Practices

### Question Design

1. **Start with Business Questions**: Define what insight you need before building queries
2. **Use Aggregations**: Always aggregate data for analytical value (SUM, COUNT, AVG, etc.)
3. **Add Time Dimensions**: Include date grouping for trend analysis
4. **Choose Appropriate Visualizations**: Line charts for trends, bar charts for comparisons, tables for detailed breakdowns
5. **Name Descriptively**: Use clear, business-friendly names like "Monthly Sales Trend" not "Query 1"

### Performance Optimization

1. **Filter Data**: Use filters to reduce data volume before aggregation
2. **Limit Date Ranges**: Default to recent periods (last 3 months, current year)
3. **Pre-aggregate When Possible**: Use dbt models to pre-calculate complex metrics
4. **Monitor Query Time**: Queries should typically run under 1 second; optimize if slower

### Collaboration

1. **Organize in Collections**: Group related Questions by business area
2. **Add Descriptions**: Document what the Question shows and when to use it
3. **Create Dashboards**: Combine multiple Questions into executive dashboards
4. **Share Links**: Use permanent Question URLs for sharing and bookmarking

## Troubleshooting

### Slow Queries

**Symptom**: Query takes >5 seconds to execute

**Solutions**:

1. Check if Trino worker nodes are running (`docker ps`)
2. Add filters to reduce data volume
3. Verify dbt models are materialized (not views)
4. Check Trino coordinator logs for resource issues

### Data Not Appearing

**Symptom**: Question returns no results or outdated data

**Solutions**:

1. Run dlt ingestion to update raw data: `just dlt::op-run`
2. Run dbt transformation: `just dbt::op-run`
3. Verify data exists in source tables using SQL Lab
4. Check date filters aren't excluding all data

## Additional Resources

- [Metabase Documentation](https://www.metabase.com/docs/latest/)
- [Trino SQL Reference](https://trino.io/docs/current/sql.html)
- [dbt Project Structure](../data/transformation/README.md)
