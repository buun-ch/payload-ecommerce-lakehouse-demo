set dotenv-filename := ".env.local"

[private]
default:
    @just --list --unsorted --list-submodules

mod payload "payload.just"
mod dlt "data/ingestion"
mod dbt "data/transformation"
