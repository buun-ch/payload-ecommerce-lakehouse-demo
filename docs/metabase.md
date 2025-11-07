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

## Working with Metabase via Browser Automation

### Recommended Tools

**Playwright MCP** (Recommended):

- Has JavaScript execution capability (`browser_evaluate` tool)
- Successfully handles React/SPA interactions
- All UI elements (tabs, dropdowns, buttons) work reliably

**Browser MCP** (Limited):

- Uses accessibility tree only, no JavaScript execution
- Struggles with React synthetic events and dynamic UI
- Dropdowns and tabs often don't respond to clicks
- Best used with direct URL navigation (see below)

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
