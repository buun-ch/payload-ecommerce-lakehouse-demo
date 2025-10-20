{{
  config(
    materialized='table'
  )
}}

-- Dimension table for products
-- Contains product master data
-- Note: Categories are in bridge_product_categories for many-to-many relationships
SELECT
    product_id,
    title AS product_name,
    slug AS product_slug,
    price_usd,
    inventory,
    created_at,
    updated_at,
    -- Product status flags
    CASE WHEN inventory > 0 THEN TRUE ELSE FALSE END AS is_in_stock,
    CASE WHEN inventory <= 10 AND inventory > 0 THEN TRUE ELSE FALSE END AS is_low_stock
FROM {{ ref('stg_products') }}
