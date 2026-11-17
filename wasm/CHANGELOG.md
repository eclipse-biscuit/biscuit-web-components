# 0.7.0

- `biscuit-auth@7.0.0`
- `query_result` in `parse_snapshot` now returns elapsed time and steps taken by a query
- `error_message` returns the human-readable message of a biscuit error returned by the other functions
- **breaking**: `query_result` in `execute` and `execute_serialized` outputs either
`null` (when no query is provided) or a `QueryResult` object
- **breaking**: biscuit-auth errors in the outputs use the new JSON encoding: variant names are
`snake_case`, enums with data are adjacently tagged (`{ type: "failed_logic", value: { ... } }`)
and enums without data are plain strings
- **breaking**: errors from `generate_token`, `get_public_key` and `attenuate_token` use the same
encoding (`{ type: "biscuit" | "parse" | "key_pair_error" | "block_parse_errors", value: ... }`)
- **breaking**: results are encoded as `{ ok: true, value }` or `{ ok: false, error }` instead of
`{ Ok: value }` or `{ Err: error }`. This applies to the outputs of `execute`, `execute_serialized`
and `attenuate_token`, and to the `authorizer_result`, `snapshot`, `authorization_result` and
`query_result.facts` fields

# 0.6.0

`biscuit-auth@6.0.0`
