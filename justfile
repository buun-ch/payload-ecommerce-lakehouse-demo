set dotenv-filename := ".env.local"

export PATH := "./node_modules/.bin:" + env_var('PATH')
export PAYLOAD_CMS_URL := env("PAYLOAD_CMS_URL", "http://localhost:3000")
export PAYLOAD_CMS_EMAIL := env("PAYLOAD_CMS_EMAIL", "")
export PAYLOAD_CMS_PASSWORD := env("PAYLOAD_CMS_PASSWORD", "")

[private]
default:
    @just --list --unsorted --list-submodules

# Get JWT token from Payload CMS
get-jwt:
    #!/bin/bash
    set -euo pipefail
    while [ -z "${PAYLOAD_CMS_EMAIL}" ]; do
        PAYLOAD_CMS_EMAIL=$(gum input --prompt="Email: " --width=100)
    done
    while [ -z "${PAYLOAD_CMS_PASSWORD}" ]; do
        PAYLOAD_CMS_PASSWORD=$(gum input --prompt="Password: " --password --width=100)
    done
    response=$(
        curl -X POST "${PAYLOAD_CMS_URL}/api/users/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${PAYLOAD_CMS_EMAIL}\",\"password\":\"${PAYLOAD_CMS_PASSWORD}\"}" -s
    )
    echo "${response}" | jq -r '.token // empty' || echo "${response}"

# Run the payload pipeline script directly
[working-directory("data/ingestion")]
run: check-venv
    #!/bin/bash
    set -euo pipefail
    source .venv/bin/activate
    source .env.local
    python payload_pipeline.py

# Run the payload pipeline script with `op run`
[working-directory("data/ingestion")]
op-run: check-venv
    #!/bin/bash
    set -euo pipefail
    source .venv/bin/activate
    op run --env-file=.env.local -- python payload_pipeline.py

[working-directory("data/ingestion")]
check-tables: check-venv
    #!/bin/bash
    set -euo pipefail
    source .venv/bin/activate
    op run --env-file=.env.local -- python check_tables.py

# Clear the DLT pipeline state
clear-pipeline:
    #!/bin/bash
    set -euo pipefail
    echo "Clearing all Payload CMS pipeline states..."
    rm -rf ~/.dlt/pipelines/payload_to_iceberg_full
    rm -rf ~/.dlt/pipelines/payload_to_iceberg_incremental
    rm -rf ~/.dlt/pipelines/payload_to_iceberg
    rm -rf ~/.dlt/pipelines/payload_to_duckdb
    echo "Pipeline states cleared!"

[private]
[working-directory("data/ingestion")]
check-venv:
    #!/bin/bash
    set -euo pipefail
    if [ ! -d .venv ]; then
        echo "Python venv not found. Create it first with 'uv venv'."
        exit 1
    fi
