{{
  config(
    materialized='incremental',
    unique_key='order_id',
    on_schema_change='sync_all_columns'
  )
}}

-- Fact table for orders
-- Contains order-level metrics with foreign keys to dimension tables
SELECT
    o.order_id,
    o.customer_id,
    o.amount / 100.0 AS amount_usd,  -- Convert cents to dollars
    o.currency,
    o.status,
    DATE(o.created_at) AS order_date,
    o.created_at,
    o.updated_at,
    -- Calculated metrics
    (SELECT COUNT(*) FROM {{ ref('stg_order_items') }} oi WHERE oi.order_id = o.order_id) AS item_count
FROM {{ ref('stg_orders') }} o

{% if is_incremental() %}
  -- Incremental logic: only load updated records
  WHERE o.updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
