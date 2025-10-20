"""
Payload CMS source configuration for dlt

This module provides pre-configured sources for Payload CMS ecommerce data.
"""

from typing import Any, List, Optional

import dlt
from dlt.sources.helpers.rest_client import RESTClient
from dlt.sources.helpers.rest_client.auth import BearerTokenAuth
from dlt.sources.helpers.rest_client.paginators import PageNumberPaginator
from dlt.sources.rest_api import rest_api_source
from dlt.sources.rest_api.typing import RESTAPIConfig


def payload_cms_source(
    base_url: str = "http://localhost:3000/api",
    collections: Optional[List[str]] = None,
    auth_token: Optional[str] = None,
    limit: int = 100,
    depth: int = 2,
) -> Any:
    """
    Create a Payload CMS REST API source.

    Parameters
    ----------
    base_url : str, default "http://localhost:3000/api"
        Base URL of Payload CMS API
    collections : list of str, optional
        List of collections to extract. If None, extracts all default ecommerce collections
        (orders, transactions, carts, products, variants, categories, users, addresses,
        variantTypes, variantOptions)
    auth_token : str, optional
        JWT authentication token for protected collections
    limit : int, default 100
        Number of records to fetch per page
    depth : int, default 2
        Depth level for fetching related/nested data

    Returns
    -------
    DltSource
        dlt source with configured resources for each collection

    Examples
    --------
    Basic usage with default collections:

    >>> source = payload_cms_source(
    ...     base_url="http://localhost:3000/api",
    ...     collections=["orders", "products", "categories"],
    ...     depth=2,
    ... )
    >>> pipeline = dlt.pipeline(
    ...     pipeline_name="payload_to_iceberg",
    ...     destination="iceberg_rest",
    ...     dataset_name="raw",
    ... )
    >>> load_info = pipeline.run(source)

    With authentication:

    >>> source = payload_cms_source(
    ...     base_url="http://localhost:3000/api",
    ...     auth_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    ...     limit=50,
    ... )
    """

    # Default ecommerce collections
    if collections is None:
        collections = [
            "orders",
            "transactions",
            "carts",
            "products",
            "variants",
            "categories",
            "users",
            "addresses",
            "variantTypes",
            "variantOptions",
        ]

    # Configure authentication
    auth_config: Optional[BearerTokenAuth] = None
    if auth_token:
        auth_config = BearerTokenAuth(token=auth_token)

    # Build resources for each collection
    resources: List[Any] = []
    for collection in collections:
        resources.append(
            {
                "name": collection,
                "endpoint": {
                    "path": collection,
                    "params": {
                        "limit": limit,
                        "depth": depth,
                        "sort": "createdAt",
                    },
                    "data_selector": "docs",
                },
                # write_disposition is set at pipeline.run() level, not here
                "primary_key": "id",
            }
        )

    config: RESTAPIConfig = {
        "client": {
            "base_url": base_url,
            "auth": auth_config,
        },
        "resource_defaults": {
            "endpoint": {
                "paginator": {
                    "type": "page_number",
                    "base_page": 1,
                    "page_param": "page",
                    "total_path": "totalPages",
                    "maximum_page": 10000,
                },
            },
        },
        "resources": resources,  # type: ignore[typeddict-item]
    }
    return rest_api_source(config)


def payload_cms_incremental(
    base_url: str = "http://localhost:3000/api",
    collections: Optional[List[str]] = None,
    auth_token: Optional[str] = None,
    limit: int = 100,
    depth: int = 2,
    initial_timestamp: str = "2024-01-01T00:00:00Z",
) -> Any:
    """
    Create a Payload CMS source with incremental loading.

    This source uses the `updatedAt` field to track changes and only loads
    records that have been updated since the last pipeline run.

    Parameters
    ----------
    base_url : str, default "http://localhost:3000/api"
        Base URL of Payload CMS API
    collections : list of str, optional
        List of collections to extract. If None, extracts default collections
        (orders, transactions, carts, products, variants, categories, users, addresses)
    auth_token : str, optional
        JWT authentication token for protected collections
    limit : int, default 100
        Number of records to fetch per page
    depth : int, default 2
        Depth level for fetching related/nested data
    initial_timestamp : str, default "2024-01-01T00:00:00Z"
        ISO 8601 timestamp to start incremental loading from on first run

    Returns
    -------
    DltSource
        dlt source with incremental loading configured using merge write disposition

    Examples
    --------
    Basic incremental loading:

    >>> source = payload_cms_incremental(
    ...     base_url="http://localhost:3000/api",
    ...     collections=["orders", "products"],
    ...     initial_timestamp="2024-01-01T00:00:00Z",
    ... )
    >>> pipeline = dlt.pipeline(
    ...     pipeline_name="payload_to_iceberg",
    ...     destination="iceberg_rest",
    ...     dataset_name="raw",
    ... )
    >>> load_info = pipeline.run(source)

    With custom start date:

    >>> source = payload_cms_incremental(
    ...     auth_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    ...     initial_timestamp="2025-01-01T00:00:00Z",
    ... )
    """

    if collections is None:
        collections = [
            "orders",
            "transactions",
            "carts",
            "products",
            "variants",
            "categories",
            "users",
            "addresses",
        ]

    auth_config: Optional[BearerTokenAuth] = None
    if auth_token:
        auth_config = BearerTokenAuth(token=auth_token)

    resources: List[Any] = []
    for collection in collections:
        resources.append(
            {
                "name": collection,
                "endpoint": {
                    "path": collection,
                    "params": {
                        "limit": limit,
                        "depth": depth,
                        "sort": "createdAt",
                        # Incremental loading via Payload's where query
                        "where[updatedAt][greater_than_equal]": {
                            "type": "incremental",
                            "cursor_path": "updatedAt",
                            "initial_value": initial_timestamp,
                        },
                    },
                    "data_selector": "docs",
                },
                # write_disposition is set at pipeline.run() level, not here
                "primary_key": "id",
            }
        )

    config: RESTAPIConfig = {
        "client": {
            "base_url": base_url,
            "auth": auth_config,
        },
        "resource_defaults": {
            "endpoint": {
                "paginator": {
                    "type": "page_number",
                    "base_page": 1,
                    "page_param": "page",
                    "total_path": "totalPages",
                    "maximum_page": 10000,
                },
            },
        },
        "resources": resources,  # type: ignore[typeddict-item]
    }
    return rest_api_source(config)
