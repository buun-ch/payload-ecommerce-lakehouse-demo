set dotenv-filename := ".env.local"

[private]
default:
    @just --list --unsorted --list-submodules

mod payload "payload.just"
mod ingestion "data/ingestion"
