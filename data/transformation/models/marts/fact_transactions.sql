{{
  config(
    materialized='incremental',
    unique_key='transaction_id',
    on_schema_change='sync_all_columns'
  )
}}

-- Fact table for payment transactions
-- Contains transaction-level data for payment analysis
SELECT
    t.transaction_id,
    t.order_id,
    t.customer_id,
    t.amount / 100.0 AS amount_usd,  -- Convert cents to dollars
    t.currency,
    t.payment_method,
    t.status,
    DATE(t.created_at) AS transaction_date,
    t.created_at,
    t.updated_at
FROM {{ ref('stg_transactions') }} t

{% if is_incremental() %}
  WHERE t.updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
