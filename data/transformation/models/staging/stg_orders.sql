{{
  config(
    materialized='view'
  )
}}

-- Clean and standardize orders from raw dlt table
-- Note: customer field is a JSON object string, need to extract id
SELECT
    id AS order_id,
    CAST(json_extract_scalar(customer, '$.id') AS INTEGER) AS customer_id,
    amount,
    currency,
    status,
    createdAt AS created_at,
    updatedAt AS updated_at
FROM {{ source('ecommerce', 'orders') }}
