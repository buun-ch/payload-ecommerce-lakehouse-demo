"""
Schema conversion utilities for Apache Iceberg.

This module provides utilities to convert dlt table schemas to Apache Iceberg
schemas via PyArrow as an intermediate representation.
"""

import pyarrow as pa
from dlt.common.destination import DestinationCapabilitiesContext
from dlt.common.libs.pyarrow import columns_to_arrow
from dlt.common.schema import TTableSchema
from pyiceberg.schema import Schema
from pyiceberg.types import (
    BinaryType,
    BooleanType,
    DateType,
    DoubleType,
    IcebergType,
    LongType,
    NestedField,
    StringType,
    TimestampType,
    TimestamptzType,
)


def create_iceberg_schema_from_table_schema(table_schema: TTableSchema) -> Schema:
    """
    Create Apache Iceberg Schema from dlt table schema.

    This function converts a dlt table schema to an Iceberg schema by first
    converting to PyArrow schema using dlt's built-in capabilities, then mapping
    PyArrow types to corresponding Iceberg types.

    Parameters
    ----------
    table_schema : TTableSchema
        dlt table schema containing column definitions and metadata

    Returns
    -------
    Schema
        Apache Iceberg schema with fields mapped from dlt columns

    Notes
    -----
    Type Mapping:
        - PyArrow string/large_string -> Iceberg StringType
        - PyArrow integer types -> Iceberg LongType
        - PyArrow floating types -> Iceberg DoubleType
        - PyArrow boolean -> Iceberg BooleanType
        - PyArrow timestamp with timezone -> Iceberg TimestamptzType
        - PyArrow timestamp without timezone -> Iceberg TimestampType
        - PyArrow date -> Iceberg DateType
        - PyArrow binary -> Iceberg BinaryType
        - Unknown types -> Iceberg StringType (fallback)

    All fields are marked as optional (required=False) to handle NULL values.

    Examples
    --------
    >>> from dlt.common.schema import TTableSchema
    >>> table_schema: TTableSchema = {
    ...     "name": "products",
    ...     "columns": {
    ...         "id": {"data_type": "bigint", "primary_key": True},
    ...         "name": {"data_type": "text"},
    ...         "price": {"data_type": "double"},
    ...     }
    ... }
    >>> iceberg_schema = create_iceberg_schema_from_table_schema(table_schema)
    >>> print(iceberg_schema)
    """

    columns = table_schema.get("columns", {})
    caps = DestinationCapabilitiesContext.generic_capabilities()
    pa_schema = columns_to_arrow(columns, caps)

    iceberg_fields = []
    field_id = 1

    for field in pa_schema:
        field_type: pa.DataType = field.type  # type: ignore
        field_name: str = str(field.name)

        iceberg_type: IcebergType
        if pa.types.is_string(field_type) or pa.types.is_large_string(field_type):
            iceberg_type = StringType()
        elif pa.types.is_integer(field_type):
            iceberg_type = LongType()
        elif pa.types.is_floating(field_type):
            iceberg_type = DoubleType()
        elif pa.types.is_boolean(field_type):
            iceberg_type = BooleanType()
        elif pa.types.is_timestamp(field_type):
            # Check if timestamp has timezone
            if field_type.tz is not None:
                iceberg_type = TimestamptzType()
            else:
                iceberg_type = TimestampType()
        elif pa.types.is_date(field_type):
            iceberg_type = DateType()
        elif pa.types.is_binary(field_type):
            iceberg_type = BinaryType()
        else:
            # Default fallback
            iceberg_type = StringType()

        iceberg_field = NestedField(
            field_id=field_id,
            name=field_name,
            field_type=iceberg_type,
            required=False,
        )
        iceberg_fields.append(iceberg_field)
        field_id += 1

    return Schema(*iceberg_fields)
