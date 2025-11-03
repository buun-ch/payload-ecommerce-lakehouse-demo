"""
Payload CMS to Iceberg data pipeline

This pipeline extracts data from Payload CMS and loads it into Iceberg tables.
"""

import os
from typing import Literal, cast

import dlt
from dlt.common.pipeline import LoadInfo

from destinations.iceberg_rest import iceberg_rest_catalog
from sources.payload_cms import payload_cms_source

# Enable debug logging for dlt and REST client
# import logging
# logging.basicConfig(level=logging.DEBUG, force=True)
# logging.getLogger("dlt").setLevel(logging.DEBUG)
# logging.getLogger("dlt.sources.helpers.rest_client").setLevel(logging.DEBUG)
# logging.getLogger("urllib3").setLevel(logging.DEBUG)

# Type alias for write disposition
TWriteDisposition = Literal["skip", "append", "replace", "merge"]


def load() -> LoadInfo:
    """
    Load data from Payload CMS.

    Returns
    -------
    LoadInfo
        Pipeline load information including loaded packages and statistics

    Environment Variables
    ---------------------
    PIPELINE_MODE : {"production", "debug"}, default "production"
        Use "debug" to load to DuckDB for testing, "production" for Iceberg
    WRITE_DISPOSITION : {"replace", "merge"}, default "replace"
        "replace" for full refresh, "merge" for incremental updates
    INITIAL_TIMESTAMP : str, default "2024-01-01T00:00:00Z"
        ISO 8601 timestamp for starting point of incremental loads (merge mode only).
        Only used on first run; subsequent runs use last updatedAt value.
    PAYLOAD_CMS_URL : str, default "http://localhost:3000/api"
        Base URL of Payload CMS API
    PAYLOAD_CMS_TOKEN : str, required
        JWT authentication token for Payload CMS
    OIDC_CLIENT_ID : str, optional
        OAuth2 client ID for Lakekeeper authentication
    OIDC_CLIENT_SECRET : str, optional
        OAuth2 client secret for Lakekeeper authentication
    KEYCLOAK_TOKEN_URL : str, optional
        Keycloak OAuth2 token endpoint (e.g., https://auth.example.com/realms/realm/protocol/openid-connect/token)
    OAUTH2_SCOPE : str, default "lakekeeper"
        OAuth2 scope for token requests (must match Keycloak client scope)
    ICEBERG_CATALOG_URL : str, default "http://localhost:8181/catalog"
        Iceberg REST Catalog endpoint URL
    ICEBERG_WAREHOUSE : str, default "ecommerce"
        Iceberg warehouse name

    Examples
    --------
    Full refresh to Iceberg (default):

    >>> python payload_pipeline.py

    Incremental load to Iceberg:

    >>> WRITE_DISPOSITION=merge python payload_pipeline.py

    Debug mode with DuckDB:

    >>> PIPELINE_MODE=debug python payload_pipeline.py
    """
    # Read configuration from environment
    mode = pipeline_mode()
    write_disposition = get_write_disposition()

    # Common configuration
    # All ecommerce collections (addresses excluded - inline in orders)
    collections = [
        "orders",           # Order records (items → orders__items)
        "transactions",     # Payment transactions (items → transactions__items)
        "carts",           # Shopping carts (items → carts__items)
        "products",        # Product catalog
        "variants",        # Product variants
        "categories",      # Product categories
        "users",           # Customer accounts
        "variantTypes",    # Variant type definitions (size, color)
        "variantOptions",  # Variant option values (S, M, L, etc)
    ]
    base_url = payload_cms_url()
    auth_token = payload_cms_token()

    # Debug mode: Load to DuckDB with limited data
    if mode == "debug":
        print("=== DEBUG MODE: Loading to DuckDB ===")
        source = payload_cms_source(
            base_url=base_url,
            collections=["orders", "products"],  # Fewer collections for testing
            auth_token=auth_token,
            limit=10,  # Small limit for testing
            depth=2,
        )

        pipeline = dlt.pipeline(
            pipeline_name="payload_to_duckdb",
            destination="duckdb",
            dataset_name="ecommerce",
        )

        load_info = pipeline.run(source)
        print(f"\nData loaded to DuckDB at: {pipeline.working_dir}")
        print(load_info)
        return load_info

    print(
        f"=== PRODUCTION MODE: Loading to Iceberg (write_disposition={write_disposition}) ==="
    )

    source = payload_cms_source(
        base_url=base_url,
        collections=collections,
        auth_token=auth_token,
        limit=1000,
        depth=2,
        incremental=(write_disposition == "merge"),
        initial_timestamp=initial_timestamp(),
    )

    pipeline = dlt.pipeline(
        pipeline_name="payload_to_iceberg",
        destination=iceberg_rest_catalog,
        dataset_name="ecommerce",
    )

    # Run with explicit write_disposition
    # For replace mode: dlt should collect all pages first, then replace the table
    load_info = pipeline.run(source, write_disposition=write_disposition)
    print(load_info)
    return load_info


def payload_cms_url() -> str:
    """
    Get Payload CMS API base URL from environment.

    Returns
    -------
    str
        Base URL of Payload CMS API, defaults to "http://localhost:3000/api"
    """
    return os.getenv("PAYLOAD_CMS_URL", "http://localhost:3000/api")


def payload_cms_token() -> str:
    """
    Get Payload CMS authentication token from environment.

    Returns
    -------
    str
        JWT authentication token, empty string if not set
    """
    return os.getenv("PAYLOAD_CMS_TOKEN", "")


def pipeline_mode() -> str:
    """
    Get pipeline execution mode from environment.

    Returns
    -------
    str
        Pipeline mode: "production" for Iceberg, "debug" for DuckDB testing
    """
    return os.getenv("PIPELINE_MODE", "production")


def get_write_disposition() -> TWriteDisposition:
    """
    Get and validate write disposition from environment variable.

    Returns
    -------
    TWriteDisposition
        Validated write disposition from WRITE_DISPOSITION environment variable

    Raises
    ------
    ValueError
        If the value is not a valid write disposition

    Notes
    -----
    Reads from WRITE_DISPOSITION environment variable, defaults to "merge".
    Valid values are: skip, append, replace, merge

    Note: Default is "merge" because rest_api_source streams pages one by one,
    and "replace" would replace the table on each page, keeping only the last page.
    """
    env_value = os.getenv("WRITE_DISPOSITION", "merge")
    valid_dispositions: tuple[TWriteDisposition, ...] = (
        "skip",
        "append",
        "replace",
        "merge",
    )
    if env_value not in valid_dispositions:
        raise ValueError(
            f"Invalid WRITE_DISPOSITION: {env_value}. "
            f"Must be one of: {', '.join(valid_dispositions)}"
        )
    return cast(TWriteDisposition, env_value)


def initial_timestamp() -> str:
    """
    Get initial timestamp for incremental loading from environment.

    Returns
    -------
    str
        ISO 8601 timestamp for starting point of incremental loads,
        defaults to "2024-01-01T00:00:00Z"

    Notes
    -----
    This timestamp is only used on the first pipeline run. Subsequent runs
    will use the last `updatedAt` value from the previous run.
    """
    return os.getenv("INITIAL_TIMESTAMP", "2024-01-01T00:00:00Z")


if __name__ == "__main__":
    load()
