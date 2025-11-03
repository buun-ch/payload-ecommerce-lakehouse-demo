"""
Custom Iceberg REST Catalog destination for dlt.

This module implements a custom dlt destination that writes data to Apache Iceberg
tables via the REST Catalog API. It supports multiple write dispositions (replace,
merge, append) and handles schema evolution automatically.

The destination uses PyArrow as the intermediate format and PyIceberg for table
operations. Configuration is read from environment variables for flexibility across
different environments.
"""

import os
from functools import cache

import dlt
import pyarrow as pa
from dlt.common.schema import TTableSchema
from dlt.common.typing import TDataItems
from pyiceberg.catalog.rest import RestCatalog
from pyiceberg.exceptions import NoSuchTableError
from pyiceberg.expressions import (
    AlwaysTrue,
    And,
    BooleanExpression,
    EqualTo,
    Or,
)

from destinations.iceberg_schema import create_iceberg_schema_from_table_schema


@cache
def get_catalog() -> RestCatalog:
    """
    Get a cached Iceberg REST Catalog instance.

    Returns
    -------
    RestCatalog
        Configured PyIceberg REST Catalog client

    Notes
    -----
    This function is cached to reuse the same catalog instance across multiple
    calls, improving performance and reducing overhead.

    Authentication is configured via environment variables:
    - OIDC_CLIENT_ID + OIDC_CLIENT_SECRET: OAuth2 client credentials (recommended)
    - KEYCLOAK_TOKEN_URL: OAuth2 token endpoint (required for OAuth2)
    - OAUTH2_SCOPE: OAuth2 scope (default: "lakekeeper")
    - ICEBERG_TOKEN: Static bearer token (legacy, for backward compatibility)
    """
    catalog_config = {
        "name": "rest_catalog",
        "uri": iceberg_catalog_url(),
        "warehouse": iceberg_warehouse(),
    }

    # Prefer OAuth2 client credentials over static token
    client_id = os.getenv("OIDC_CLIENT_ID")
    client_secret = os.getenv("OIDC_CLIENT_SECRET")

    if client_id and client_secret:
        # Use OAuth2 client credentials (format: "client_id:client_secret")
        catalog_config["credential"] = f"{client_id}:{client_secret}"
        # Specify external OAuth2 provider token endpoint (Keycloak)
        # Lakekeeper v0.9.x requires external OAuth2 provider instead of /v1/oauth/tokens
        token_url = keycloak_token_url()
        if token_url:
            catalog_config["oauth2-server-uri"] = token_url
        # Specify OAuth2 scope (default: "lakekeeper" for Keycloak)
        # PyIceberg defaults to "catalog" scope, but Keycloak uses "lakekeeper"
        scope = oauth2_scope()
        if scope:
            catalog_config["scope"] = scope
    else:
        # Fallback to static token for backward compatibility
        token = iceberg_token()
        if token:
            catalog_config["token"] = token

    return RestCatalog(**catalog_config)


def iceberg_catalog_url() -> str:
    """
    Get Iceberg REST Catalog URL from environment.

    Returns
    -------
    str
        REST Catalog API endpoint URL, defaults to "http://localhost:8181/catalog"
    """
    return os.getenv("ICEBERG_CATALOG_URL", "http://localhost:8181/catalog")


def iceberg_warehouse() -> str:
    """
    Get Iceberg warehouse name from environment.

    Returns
    -------
    str
        Warehouse identifier, defaults to "ecommerce"
    """
    return os.getenv("ICEBERG_WAREHOUSE", "ecommerce")


def iceberg_namespace() -> str:
    """
    Get Iceberg namespace from environment.

    Returns
    -------
    str
        Namespace (database) name for tables, defaults to "ecommerce"
    """
    return os.getenv("ICEBERG_NAMESPACE", "ecommerce")


def iceberg_token() -> str:
    """
    Get Iceberg authentication token from environment.

    Returns
    -------
    str
        Authentication token for REST Catalog, empty string if not set
    """
    return os.getenv("ICEBERG_TOKEN", "")


def keycloak_token_url() -> str:
    """
    Get Keycloak OAuth2 token endpoint from environment.

    Returns
    -------
    str
        Keycloak token endpoint URL for OAuth2 authentication, empty string if not set

    Notes
    -----
    This endpoint is required when using OAuth2 client credentials flow with Lakekeeper.
    Lakekeeper v0.9.x requires external OAuth2 provider (Keycloak) instead of the
    deprecated /v1/oauth/tokens endpoint.

    Example: https://auth.example.com/realms/buunstack/protocol/openid-connect/token
    """
    return os.getenv("KEYCLOAK_TOKEN_URL", "")


def oauth2_scope() -> str:
    """
    Get OAuth2 scope for Lakekeeper authentication from environment.

    Returns
    -------
    str
        OAuth2 scope for token requests, defaults to "lakekeeper"

    Notes
    -----
    PyIceberg's default scope is "catalog", but Keycloak-authenticated Lakekeeper
    requires the "lakekeeper" scope to include the audience claim in JWT tokens.
    """
    return os.getenv("OAUTH2_SCOPE", "lakekeeper")


def batch_size() -> int:
    """
    Get batch size for data loading from environment.

    Returns
    -------
    int
        Number of records to process per batch, defaults to 1000
    """
    return int(os.getenv("BATCH_SIZE", "1000"))


def get_primary_keys(table: TTableSchema) -> list[str]:
    """
    Extract primary key column names from dlt table schema.

    Parameters
    ----------
    table : TTableSchema
        dlt table schema containing column definitions

    Returns
    -------
    list of str
        List of column names marked as primary keys, empty list if none defined
    """
    primary_keys = []
    if "columns" in table:
        for column_name, column_info in table["columns"].items():
            if column_info.get("primary_key", False):
                primary_keys.append(column_name)
    return primary_keys


@dlt.destination(batch_size=batch_size(), loader_file_format="parquet")
def iceberg_rest_catalog(items: TDataItems, table: TTableSchema) -> None:
    """
    Custom dlt destination for Apache Iceberg via REST Catalog.

    This function writes data batches to Iceberg tables, handling table creation,
    write dispositions (replace/merge/append), and schema alignment automatically.

    Parameters
    ----------
    items : TDataItems
        Data items to load, can be PyArrow Table, RecordBatch, or list of dicts
    table : TTableSchema
        dlt table schema containing metadata, write disposition, and column definitions

    Environment Variables
    ---------------------
    ICEBERG_CATALOG_URL : str, default "http://localhost:8181/catalog"
        REST Catalog API endpoint
    ICEBERG_WAREHOUSE : str, default "ecommerce"
        Warehouse identifier
    ICEBERG_NAMESPACE : str, default "ecommerce"
        Namespace (database) for tables
    OIDC_CLIENT_ID : str, optional
        OAuth2 client ID for authentication (recommended)
    OIDC_CLIENT_SECRET : str, optional
        OAuth2 client secret for authentication (recommended)
    ICEBERG_TOKEN : str, optional
        Static bearer token for REST Catalog (legacy, deprecated)
    BATCH_SIZE : int, default 1000
        Number of records per batch

    Notes
    -----
    Write Dispositions:
        - replace: Deletes all existing data, then appends new data
        - merge: Deletes rows matching primary keys, then appends new data
        - append: Simply appends new data without deletion

    Table Creation:
        If table doesn't exist, it's created automatically with schema inferred
        from the dlt table schema. Tables use Parquet format with Snappy compression.

    Schema Alignment:
        Data is automatically aligned to match the Iceberg table schema. Missing
        columns are filled with NULL values.

    Examples
    --------
    Use as a dlt destination:

    >>> import dlt
    >>> from destinations.iceberg_rest import iceberg_rest_catalog
    >>> pipeline = dlt.pipeline(
    ...     pipeline_name="my_pipeline",
    ...     destination=iceberg_rest_catalog,
    ...     dataset_name="my_dataset",
    ... )
    >>> pipeline.run(source, write_disposition="replace")

    Raises
    ------
    ValueError
        If table schema doesn't contain a 'name' field
    NoSuchTableError
        If table doesn't exist and needs to be created
    """
    if "name" not in table:
        raise ValueError("Table schema must have a 'name' field")
    table_name = table["name"]
    full_table_name = f"{iceberg_namespace()}.{table_name}"

    catalog = get_catalog()
    write_disposition = table.get("write_disposition", "append")

    try:
        i_table = catalog.load_table(full_table_name)
        print(
            f"Table {full_table_name} found, proceeding with {write_disposition} mode"
        )

        # Handle different write dispositions
        if write_disposition == "replace":
            print(f"Replace mode: deleting all data from {full_table_name}")
            i_table.delete(delete_filter=AlwaysTrue())

        elif write_disposition == "merge":
            primary_keys = get_primary_keys(table)
            print(f"Merge mode for {full_table_name}, primary keys: {primary_keys}")
            if primary_keys:
                print(f"Merge mode: updating/inserting based on keys {primary_keys}")

                # Convert to PyArrow Table if needed
                if isinstance(items, pa.RecordBatch):
                    pa_data = pa.Table.from_batches([items])
                elif isinstance(items, pa.Table):
                    pa_data = items
                else:
                    pa_data = pa.Table.from_pylist(items)

                # Check if primary keys exist in data
                if all(pk in pa_data.schema.names for pk in primary_keys):
                    # Build delete filter using PyArrow columns directly
                    conditions: list[BooleanExpression] = []

                    # Extract primary key columns
                    pk_columns = {
                        pk: pa_data.column(pk).to_pylist() for pk in primary_keys
                    }

                    # Create filter conditions for each row
                    for i in range(len(pa_data)):
                        pk_conditions: list[BooleanExpression] = []
                        for pk in primary_keys:
                            pk_value = pk_columns[pk][i]
                            if pk_value is not None:
                                pk_conditions.append(EqualTo(pk, pk_value))

                        if pk_conditions:
                            if len(pk_conditions) == 1:
                                conditions.append(pk_conditions[0])
                            else:
                                conditions.append(And(*pk_conditions))

                    # Delete existing records with matching primary keys
                    if conditions:
                        delete_filter: BooleanExpression
                        if len(conditions) == 1:
                            delete_filter = conditions[0]
                        else:
                            delete_filter = Or(*conditions)

                        print("Deleting existing records with matching primary keys...")
                        i_table.delete(delete_filter=delete_filter)
                else:
                    print(
                        f"Warning: Primary keys {primary_keys} not found in data, falling back to append"
                    )
            else:
                print(
                    "Warning: No primary keys defined for merge, falling back to append"
                )

    except NoSuchTableError:
        print(f"Table {full_table_name} not found, creating it...")
        iceberg_schema = create_iceberg_schema_from_table_schema(table)
        i_table = catalog.create_table(
            identifier=full_table_name,
            schema=iceberg_schema,
            properties={
                "write.format.default": "parquet",
                "write.parquet.compression-codec": "snappy",
            },
        )
        print(f"Created table {full_table_name}")

    # Get Iceberg table's Arrow schema and align data
    iceberg_arrow_schema = i_table.schema().as_arrow()
    if isinstance(items, (pa.Table, pa.RecordBatch)):
        if isinstance(items, pa.RecordBatch):
            pa_table = pa.Table.from_batches([items])
        else:
            pa_table = items

        for field in iceberg_arrow_schema:
            if field.name not in pa_table.schema.names:
                null_array = pa.array([None] * len(pa_table), type=field.type)
                pa_table = pa_table.append_column(field.name, null_array)

        pa_table = pa_table.select([field.name for field in iceberg_arrow_schema])
    else:
        iceberg_field_names = {field.name for field in iceberg_arrow_schema}
        for item in items:
            for field_name in iceberg_field_names:
                if field_name not in item:
                    item[field_name] = None

        pa_table = pa.Table.from_pylist(items, schema=iceberg_arrow_schema)

    i_table.append(pa_table)
