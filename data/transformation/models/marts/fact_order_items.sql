{{
  config(
    materialized='incremental',
    unique_key='order_item_id',
    on_schema_change='sync_all_columns'
  )
}}

-- Fact table for order items (order line items)
-- Contains item-level metrics for detailed analysis
WITH order_items AS (
    SELECT
        oi.order_item_id,
        oi.order_id,
        oi.product_id,
        oi.variant_id,
        oi.quantity,
        o.created_at,
        o.updated_at
    FROM {{ ref('stg_order_items') }} oi
    JOIN {{ ref('stg_orders') }} o ON oi.order_id = o.order_id
),

item_pricing AS (
    SELECT
        oi.*,
        -- Get price from variant if available, otherwise from product
        COALESCE(v.price_usd, p.price_usd, 0) AS unit_price_usd
    FROM order_items oi
    LEFT JOIN {{ ref('stg_variants') }} v ON oi.variant_id = v.variant_id
    LEFT JOIN {{ ref('stg_products') }} p ON oi.product_id = p.product_id
)

SELECT
    order_item_id,
    order_id,
    product_id,
    variant_id,
    quantity,
    unit_price_usd,
    quantity * unit_price_usd AS line_total_usd,
    created_at,
    updated_at
FROM item_pricing

{% if is_incremental() %}
  WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
