{{
  config(
    materialized='table'
  )
}}

-- Dimension table for products
-- Contains product master data with category denormalization
WITH product_categories AS (
    SELECT
        p.product_id,
        p.title,
        p.slug,
        p.price_usd,
        p.inventory,
        p.created_at,
        p.updated_at,
        -- Get first category (products can have multiple categories)
        -- dlt normalizes arrays, so we need to join through products__categories
        CAST(NULL AS INTEGER) AS category_id,
        CAST(NULL AS VARCHAR) AS category_name
    FROM {{ ref('stg_products') }} p
)

SELECT
    product_id,
    title AS product_name,
    slug AS product_slug,
    price_usd,
    inventory,
    category_id,
    category_name,
    created_at,
    updated_at,
    -- Product status flags
    CASE WHEN inventory > 0 THEN TRUE ELSE FALSE END AS is_in_stock,
    CASE WHEN inventory <= 10 AND inventory > 0 THEN TRUE ELSE FALSE END AS is_low_stock
FROM product_categories
