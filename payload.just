set fallback := true

export PATH := "./node_modules/.bin:" + env_var('PATH')
export PAYLOAD_CMS_EMAIL := env("PAYLOAD_CMS_EMAIL", "")
export PAYLOAD_CMS_PASSWORD := env("PAYLOAD_CMS_PASSWORD", "")
tmpdir := `mktemp -d`
jwt_response_file := tmpdir / "response.json"

[private]
default:
    @just --list --unsorted --list-submodules

# Get JWT token from Payload CMS
get-jwt:
    #!/bin/bash
    set -uo pipefail
    source ./.env
    while [ -z "${PAYLOAD_CMS_EMAIL}" ]; do
        PAYLOAD_CMS_EMAIL=$(gum input --prompt="Email: " --width=100)
    done
    while [ -z "${PAYLOAD_CMS_PASSWORD}" ]; do
        PAYLOAD_CMS_PASSWORD=$(gum input --prompt="Password: " --password --width=100)
    done
    http_code=$(curl -X POST "${PAYLOAD_PUBLIC_SERVER_URL}/api/users/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${PAYLOAD_CMS_EMAIL}\",\"password\":\"${PAYLOAD_CMS_PASSWORD}\"}" \
        -w "%{http_code}" -sS -o {{ jwt_response_file }} 2>&1 | tail -n1)
    curl_exit_code=$?
    if [ ${curl_exit_code} -ne 0 ]; then
        echo "Error: Failed to connect to Payload CMS at ${PAYLOAD_PUBLIC_SERVER_URL}" >&2
        echo "curl exit code: ${curl_exit_code}" >&2
        echo "curl output: ${http_code}" >&2
        exit 1
    fi
    response=$(cat {{ jwt_response_file }})
    if [ "${http_code}" != "200" ]; then
        echo "Error: HTTP ${http_code} from Payload CMS" >&2
        echo "URL: ${PAYLOAD_PUBLIC_SERVER_URL}/api/users/login" >&2
        echo "Response: ${response}" >&2
        exit 1
    fi
    if [ -z "${response}" ]; then
        echo "Error: Empty response from Payload CMS API" >&2
        exit 1
    fi
    if ! token=$(echo "${response}" | jq -r '.token // empty' 2>&1); then
        echo "Error: Failed to parse JSON response" >&2
        echo "jq error: ${token}" >&2
        echo "Response: ${response}" >&2
        exit 1
    fi
    if [ -z "${token}" ]; then
        echo "Error: No token found in response" >&2
        echo "Response: ${response}" >&2
        exit 1
    fi
    echo "${token}"

# Seed database with realistic data (medium preset)
seed preset="medium":
    pnpm seed:{{ preset }}

# Seed database with op run (to load Pexels API key)
op-seed preset="medium":
    op run --env-file=.env.just -- pnpm seed:{{ preset }}

# Clear all seeded data from database
clear-seed:
    pnpm clear-seed
