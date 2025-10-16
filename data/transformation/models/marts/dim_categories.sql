{{
  config(
    materialized='table'
  )
}}

-- Dimension table for product categories
SELECT
    category_id,
    category_name,
    category_slug,
    created_at,
    updated_at
FROM {{ ref('stg_categories') }}
