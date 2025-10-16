{{
  config(
    materialized='view'
  )
}}

-- Clean and standardize categories
SELECT
    id AS category_id,
    title AS category_name,
    slug AS category_slug,
    createdAt AS created_at,
    updatedAt AS updated_at
FROM {{ source('ecommerce', 'categories') }}
