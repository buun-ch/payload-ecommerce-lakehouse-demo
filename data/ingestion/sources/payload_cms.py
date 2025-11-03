"""
Payload CMS source configuration for dlt

This module provides pre-configured sources for Payload CMS ecommerce data.
"""

from typing import Any, List, Optional

from dlt.sources.helpers.rest_client.auth import BearerTokenAuth
from dlt.sources.rest_api import rest_api_source
from dlt.sources.rest_api.typing import RESTAPIConfig


def payload_cms_source(
    base_url: str = "http://localhost:3000/api",
    collections: Optional[List[str]] = None,
    auth_token: Optional[str] = None,
    limit: int = 100,
    depth: int = 2,
    incremental: bool = False,
    initial_timestamp: str = "2024-01-01T00:00:00Z",
) -> Any:
    """
    Create a Payload CMS REST API source.

    Parameters
    ----------
    base_url : str, default "http://localhost:3000/api"
        Base URL of Payload CMS API
    collections : list of str, optional
        List of collections to extract. If None, extracts all default ecommerce collections.
        When incremental=False: includes variantTypes and variantOptions.
        When incremental=True: excludes variantTypes and variantOptions.
    auth_token : str, optional
        JWT authentication token for protected collections
    limit : int, default 100
        Number of records to fetch per page
    depth : int, default 2
        Depth level for fetching related/nested data
    incremental : bool, default False
        Enable incremental loading using updatedAt field
    initial_timestamp : str, default "2024-01-01T00:00:00Z"
        ISO 8601 timestamp to start incremental loading from on first run

    Returns
    -------
    DltSource
        dlt source with configured resources for each collection
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
        ]
        if not incremental:
            collections.extend(["variantTypes", "variantOptions"])

    # Configure authentication
    auth_config: Optional[BearerTokenAuth] = None
    if auth_token:
        auth_config = BearerTokenAuth(token=auth_token)

    # Build resources for each collection
    resources: List[Any] = []
    for collection in collections:
        params: dict[str, Any] = {
            "limit": limit,
            "depth": depth,
            "sort": "createdAt",
        }

        if incremental:
            params["where[updatedAt][greater_than_equal]"] = {
                "type": "incremental",
                "cursor_path": "updatedAt",
                "initial_value": initial_timestamp,
            }

        resources.append(
            {
                "name": collection,
                "endpoint": {
                    "path": collection,
                    "params": params,
                    "data_selector": "docs",
                },
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
