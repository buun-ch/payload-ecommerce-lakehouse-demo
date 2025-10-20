{{
  config(
    materialized='view'
  )
}}

-- Unnest product-category relationships from JSON array
-- This creates a row for each product-category pair
WITH unnested_categories AS (
    SELECT
        id AS product_id,
        CAST(json_parse(categories) AS ARRAY(JSON)) AS categories_array
    FROM {{ source('ecommerce', 'products') }}
    WHERE categories IS NOT NULL
),

flattened AS (
    SELECT
        product_id,
        category_json
    FROM unnested_categories
    CROSS JOIN UNNEST(categories_array) AS t(category_json)
)

SELECT
    product_id,
    TRY_CAST(json_extract_scalar(category_json, '$.id') AS INTEGER) AS category_id,
    json_extract_scalar(category_json, '$.title') AS category_name,
    json_extract_scalar(category_json, '$.slug') AS category_slug
FROM flattened
