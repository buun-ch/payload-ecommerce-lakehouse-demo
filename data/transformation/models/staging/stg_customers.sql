{{
  config(
    materialized='view'
  )
}}

-- Clean and standardize customers from users table
-- Filter only customers (not admin users)
-- Note: roles field is a JSON array string
SELECT
    id AS customer_id,
    name,
    email,
    createdAt AS created_at,
    updatedAt AS updated_at
FROM {{ source('ecommerce', 'users') }}
WHERE contains(CAST(json_extract(roles, '$') AS ARRAY(VARCHAR)), 'customer')
