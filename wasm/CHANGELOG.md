# 0.7.0

- `biscuit-auth@7.0.0`
- `query_result` in `parse_snapshot` now returns elapsed time and steps taken by a query
- **breaking**: `query_result` in `execute` and `execute_serialized` outputs either
`null` (when no query is provided) or a `QueryResult` object
- **breaking**: biscuit-auth errors in the outputs use the new JSON encoding: variant names are
`snake_case`, enums with data are adjacently tagged (`{ type: "failed_logic", value: { ... } }`)
and enums without data are plain strings. The wrappers around them (`Ok` / `Err`, `Biscuit`,
`KeyPairError`, `Parse`, `BlockParseErrors`) are unchanged

# 0.6.0

`biscuit-auth@6.0.0`
