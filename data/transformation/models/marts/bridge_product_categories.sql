{{
  config(
    materialized='table'
  )
}}

-- Bridge table for many-to-many product-category relationships
-- This table enables querying products by multiple categories
SELECT
    product_id,
    category_id
FROM {{ ref('stg_product_categories') }}
WHERE category_id IS NOT NULL
