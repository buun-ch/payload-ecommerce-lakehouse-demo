{{
  config(
    materialized='view'
  )
}}

-- Clean and standardize transactions
-- Note: order and customer fields are JSON objects
SELECT
    id AS transaction_id,
    CAST(json_extract_scalar("order", '$.id') AS INTEGER) AS order_id,
    CAST(json_extract_scalar(customer, '$.id') AS INTEGER) AS customer_id,
    amount,
    currency,
    paymentMethod AS payment_method,
    status,
    createdAt AS created_at,
    updatedAt AS updated_at
FROM {{ source('ecommerce', 'transactions') }}
