{{
  config(
    materialized='table'
  )
}}

-- Dimension table for dates
-- Generates a date spine from 2020-01-01 to 2030-12-31
WITH date_range AS (
    SELECT
        CAST(date_series AS DATE) AS date_day
    FROM (
        SELECT SEQUENCE(
            DATE '2020-01-01',
            DATE '2030-12-31',
            INTERVAL '1' DAY
        ) AS date_array
    )
    CROSS JOIN UNNEST(date_array) AS t(date_series)
)

SELECT
    date_day AS date_key,
    date_day,
    EXTRACT(YEAR FROM date_day) AS year,
    EXTRACT(QUARTER FROM date_day) AS quarter,
    EXTRACT(MONTH FROM date_day) AS month,
    EXTRACT(DAY FROM date_day) AS day,
    DAY_OF_WEEK(date_day) AS day_of_week,  -- 1=Monday, 7=Sunday
    FORMAT_DATETIME(date_day, 'EEEE') AS day_name,
    WEEK(date_day) AS week_of_year,
    -- Useful flags
    CASE WHEN DAY_OF_WEEK(date_day) IN (6, 7) THEN TRUE ELSE FALSE END AS is_weekend,
    CASE WHEN EXTRACT(MONTH FROM date_day) IN (11, 12) THEN TRUE ELSE FALSE END AS is_holiday_season
FROM date_range
