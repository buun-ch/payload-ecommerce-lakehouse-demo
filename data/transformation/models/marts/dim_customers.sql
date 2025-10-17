{{
  config(
    materialized='table',
    on_schema_change='fail'
  )
}}

-- Dimension table for customers
-- Contains customer master data with calculated metrics
WITH customer_orders AS (
    SELECT
        customer_id,
        COUNT(DISTINCT order_id) AS total_orders,
        SUM(amount_usd) AS lifetime_value_usd,
        MIN(created_at) AS first_order_date,
        MAX(created_at) AS last_order_date
    FROM {{ ref('fact_orders') }}
    GROUP BY customer_id
)

SELECT
    c.customer_id,
    c.name AS customer_name,
    c.email AS customer_email,
    c.created_at AS customer_since,
    DATE_DIFF('day', CAST(c.created_at AS DATE), CURRENT_DATE) AS customer_lifetime_days,
    -- Metrics from orders
    COALESCE(co.total_orders, 0) AS total_orders,
    COALESCE(co.lifetime_value_usd, 0) AS lifetime_value_usd,
    co.first_order_date,
    co.last_order_date,
    -- Customer segmentation
    CASE
        WHEN COALESCE(co.total_orders, 0) >= 10 THEN 'VIP'
        WHEN COALESCE(co.total_orders, 0) >= 5 THEN 'Regular'
        WHEN COALESCE(co.total_orders, 0) >= 1 THEN 'Active'
        ELSE 'New'
    END AS customer_segment,
    c.updated_at
FROM {{ ref('stg_customers') }} c
LEFT JOIN customer_orders co ON c.customer_id = co.customer_id
