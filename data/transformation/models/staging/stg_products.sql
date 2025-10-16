{{
  config(
    materialized='view'
  )
}}

-- Clean and standardize products
SELECT
    id AS product_id,
    title,
    slug,
    priceInUSD AS price_in_cents,
    priceInUSD / 100.0 AS price_usd,
    inventory,
    createdAt AS created_at,
    updatedAt AS updated_at
FROM {{ source('ecommerce', 'products') }}
