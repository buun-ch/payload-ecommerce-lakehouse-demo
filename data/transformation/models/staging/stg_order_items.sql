{{
  config(
    materialized='view'
  )
}}

-- Clean and standardize order items from nested JSON array
-- Note: items field is a JSON array string, need to unnest and parse
WITH unnested_items AS (
    SELECT
        id AS order_id,
        item_json
    FROM {{ source('ecommerce', 'orders') }}
    CROSS JOIN UNNEST(CAST(json_extract(items, '$') AS ARRAY(JSON))) AS t(item_json)
)
SELECT
    json_extract_scalar(item_json, '$.id') AS order_item_id,
    order_id,
    CAST(json_extract_scalar(item_json, '$.product.id') AS INTEGER) AS product_id,
    CAST(json_extract_scalar(item_json, '$.variant.id') AS INTEGER) AS variant_id,
    CAST(json_extract_scalar(item_json, '$.quantity') AS INTEGER) AS quantity
FROM unnested_items
