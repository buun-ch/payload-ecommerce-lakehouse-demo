"""
Payload CMS to Iceberg data pipeline

This pipeline extracts data from Payload CMS and loads it into Iceberg tables.
"""

import os

import dlt

from destinations.iceberg_rest import iceberg_rest_catalog
from sources.payload_cms import payload_cms_incremental, payload_cms_source


def load_full_refresh():
    """
    Full refresh load: Replace all data in Iceberg tables
    """
    source = payload_cms_source(
        base_url=payload_cms_url(),
        collections=["orders", "products", "categories", "variants"],
        auth_token=payload_cms_token(),
        limit=100,
        depth=2,
    )

    pipeline = dlt.pipeline(
        pipeline_name="payload_to_iceberg_full",
        destination=iceberg_rest_catalog,
        dataset_name="ecommerce",
    )

    load_info = pipeline.run(source)
    print(load_info)


def load_incremental():
    """
    Incremental load: Only load new/updated records since last run
    """
    source = payload_cms_incremental(
        base_url=payload_cms_url(),
        collections=["orders", "products", "categories", "variants"],
        auth_token=payload_cms_token(),
        limit=100,
        depth=2,
        initial_timestamp="2024-01-01T00:00:00Z",
    )

    pipeline = dlt.pipeline(
        pipeline_name="payload_to_iceberg_incremental",
        destination=iceberg_rest_catalog,
        dataset_name="ecommerce",
    )

    load_info = pipeline.run(source)
    print(load_info)


def load_with_duckdb():
    """
    Load to DuckDB for development and testing
    Useful when Iceberg is not ready or for quick verification
    """

    source = payload_cms_source(
        base_url=payload_cms_url(),
        collections=["orders", "products"],
        auth_token=payload_cms_token(),
        limit=10,  # Small limit for testing
        depth=2,
    )

    pipeline = dlt.pipeline(
        pipeline_name="payload_to_duckdb",
        destination="duckdb",
        dataset_name="ecommerce",
    )

    load_info = pipeline.run(source)
    print(load_info)
    print(f"Data loaded to DuckDB at: {pipeline.working_dir}")



def payload_cms_url() -> str:
    return os.getenv("PAYLOAD_CMS_URL", "http://localhost:3000/api")


def payload_cms_token() -> str:
    return os.getenv("PAYLOAD_CMS_TOKEN", "")


if __name__ == "__main__":
    # Choose which load to run
    load_full_refresh()
    # load_incremental()
    # load_with_duckdb()
