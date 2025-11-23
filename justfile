set dotenv-filename := ".env.just"

export TRINO_HOST := env("TRINO_HOST", "")
export TRINO_USER := env("TRINO_USER", "")
export TRINO_EXECUTE := env("TRINO_EXECUTE", "")

[private]
default:
    @just --list --unsorted --list-submodules

mod payload "payload.just"
mod dlt "data/ingestion"
mod dbt "data/transformation"

trino user="":
    #!/bin/bash
    set -euo pipefail
    if ! command -v trino &>/dev/null; then
        echo "Error: trino command not found"
        echo "Please install Trino CLI first"
        exit 1
    fi
    TRINO_HOST="${TRINO_HOST}"
    while [ -z "${TRINO_HOST}" ]; do
        TRINO_HOST=$(gum input --prompt="Trino host (FQDN): " --width=100 \
            --placeholder="e.g., trino.example.com")
    done
    TRINO_USER="{{ user }}"
    if [ -z "${TRINO_USER}" ]; then
        TRINO_USER=$(gum input --prompt="Username (Keycloak username): " --width=100 \
            --placeholder="e.g., buun")
    fi
    echo "Connecting to Trino at https://${TRINO_HOST} as user: ${TRINO_USER}"
    echo "OIDC authentication will open in your browser..."
    if [ -n "${TRINO_EXECUTE}" ]; then
        echo "Executing query:"
        echo "${TRINO_EXECUTE}"
        trino --server "https://${TRINO_HOST}" \
            --user "${TRINO_USER}" \
            --external-authentication \
            --execute "${TRINO_EXECUTE}"
        exit 0
    else
        echo "Opening interactive Trino shell..."
        trino --server "https://${TRINO_HOST}" \
            --user "${TRINO_USER}" \
            --external-authentication
    fi

# Drop all Iceberg tables (raw + staging + marts)
drop-tables user="":
    #!/bin/bash
    set -euxo pipefail
    export TRINO_EXECUTE=$(cat <<EOF
        DROP TABLE IF EXISTS iceberg.ecommerce.orders;
        DROP TABLE IF EXISTS iceberg.ecommerce.transactions;
        DROP TABLE IF EXISTS iceberg.ecommerce.carts;
        DROP TABLE IF EXISTS iceberg.ecommerce.products;
        DROP TABLE IF EXISTS iceberg.ecommerce.variants;
        DROP TABLE IF EXISTS iceberg.ecommerce.categories;
        DROP TABLE IF EXISTS iceberg.ecommerce.users;
        DROP TABLE IF EXISTS iceberg.ecommerce.varianttypes;
        DROP TABLE IF EXISTS iceberg.ecommerce.variantoptions;

        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_carts;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_categories;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_customers;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_order_items;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_orders;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_product_categories;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_products;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_transactions;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_variants;

        DROP TABLE IF EXISTS iceberg.ecommerce_marts.bridge_product_categories;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.dim_categories;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.dim_customers;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.dim_date;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.dim_products;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.fact_order_items;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.fact_orders;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.fact_transactions;
    EOF
    )
    echo "Dropping all Iceberg tables... ${TRINO_EXECUTE}"
    just trino "{{ user }}"

# Drop raw tables only
drop-raw-tables user="":
    #!/bin/bash
    set -euo pipefail
    export TRINO_EXECUTE=$(cat <<EOF
        DROP TABLE IF EXISTS iceberg.ecommerce.orders;
        DROP TABLE IF EXISTS iceberg.ecommerce.transactions;
        DROP TABLE IF EXISTS iceberg.ecommerce.carts;
        DROP TABLE IF EXISTS iceberg.ecommerce.products;
        DROP TABLE IF EXISTS iceberg.ecommerce.variants;
        DROP TABLE IF EXISTS iceberg.ecommerce.categories;
        DROP TABLE IF EXISTS iceberg.ecommerce.users;
        DROP TABLE IF EXISTS iceberg.ecommerce.varianttypes;
        DROP TABLE IF EXISTS iceberg.ecommerce.variantoptions;
    EOF
    )
    just trino "{{ user }}"

# Drop staging views only
drop-staging-tables user="":
    #!/bin/bash
    set -euo pipefail
    export TRINO_EXECUTE=$(cat <<EOF
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_carts;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_categories;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_customers;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_order_items;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_orders;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_product_categories;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_products;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_transactions;
        DROP VIEW IF EXISTS iceberg.ecommerce_staging.stg_variants;
    EOF
    )
    just trino "{{ user }}"

# Drop marts tables only
drop-mart-tables user="":
    #!/bin/bash
    set -euo pipefail
    export TRINO_EXECUTE=$(cat <<EOF
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.bridge_product_categories;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.dim_categories;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.dim_customers;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.dim_date;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.dim_products;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.fact_order_items;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.fact_orders;
        DROP TABLE IF EXISTS iceberg.ecommerce_marts.fact_transactions;
    EOF
    )
    just trino "{{ user }}"
