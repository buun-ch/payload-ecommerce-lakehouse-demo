{{
  config(
    materialized='view'
  )
}}

-- Clean and standardize carts
-- Note: customer field is a JSON object (or null for guest carts)
SELECT
    id AS cart_id,
    CAST(json_extract_scalar(customer, '$.id') AS INTEGER) AS customer_id,
    currency,
    subtotal,
    purchasedAt AS purchased_at,
    createdAt AS created_at,
    updatedAt AS updated_at,
    -- Cart abandonment flag
    CASE WHEN purchasedAt IS NULL THEN TRUE ELSE FALSE END AS is_abandoned
FROM {{ source('ecommerce', 'carts') }}
