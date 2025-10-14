"""
Payload CMS source configuration for dlt

This module provides pre-configured sources for Payload CMS ecommerce data.
"""

from typing import Any, List, Optional

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
    Create a Payload CMS REST API source

    Args:
        base_url: Base URL of Payload CMS API
        collections: List of collections to extract (default: all ecommerce collections)
        auth_token: JWT authentication token (optional)
        limit: Records per page
        depth: Related data depth

    Returns:
        dlt source with configured resources

    Example:
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
                    "paginator": PageNumberPaginator(
                        page_param="page",
                        total_path="totalPages",
                        maximum_page=10000,
                    ),
                    "data_selector": "docs",
                },
                "write_disposition": "replace",  # Can be changed to "merge" for incremental
                "primary_key": "id",
            }
        )

    config: RESTAPIConfig = {
        "client": {
            "base_url": base_url,
            "auth": auth_config,
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
    Create a Payload CMS source with incremental loading

    Args:
        base_url: Base URL of Payload CMS API
        collections: List of collections to extract
        auth_token: JWT authentication token (optional)
        limit: Records per page
        depth: Related data depth
        initial_timestamp: Initial timestamp for incremental loading

    Returns:
        dlt source with incremental loading configured

    Example:
        >>> source = payload_cms_incremental(
        ...     base_url="http://localhost:3000/api",
        ...     collections=["orders", "products"],
        ...     initial_timestamp="2024-01-01T00:00:00Z",
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
                    "paginator": PageNumberPaginator(
                        page_param="page",
                        total_path="totalPages",
                        maximum_page=10000,
                    ),
                    "data_selector": "docs",
                },
                "write_disposition": "merge",  # Merge for incremental updates
                "primary_key": "id",
            }
        )

    config: RESTAPIConfig = {
        "client": {
            "base_url": base_url,
            "auth": auth_config,
        },
        "resources": resources,  # type: ignore[typeddict-item]
    }
    return rest_api_source(config)
