set fallback := true

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

# Seed database with realistic data (medium preset)
seed preset="medium":
    pnpm seed:{{ preset }}

# Seed database with op run (to load Pexels API key)
op-seed preset="medium":
    op run --env-file=.env.local -- pnpm seed:{{ preset }}

# Clear all seeded data from database
clear-seed:
    pnpm clear-seed
