{{
  config(
    materialized='view'
  )
}}

-- Clean and standardize product variants
-- Note: product field is a JSON object
SELECT
    id AS variant_id,
    title AS variant_title,
    CAST(json_extract_scalar(product, '$.id') AS INTEGER) AS product_id,
    priceInUSD AS price_in_cents,
    priceInUSD / 100.0 AS price_usd,
    inventory,
    createdAt AS created_at,
    updatedAt AS updated_at
FROM {{ source('ecommerce', 'variants') }}
