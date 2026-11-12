/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
export type LibMarker = {
  position: {
    start: number;
    end: number;
  };
  ok: boolean;
};

export type CMMarker = {
  start: number;
  end: number;
  ok: boolean;
};

export const convertMarkerLegacy = (marker: LibMarker) => {
  return {
    start: marker.position.start,
    end: marker.position.end,
    ok: marker.ok,
  };
};

export const convertMarker = (marker: LibMarker) => {
  console.log({ marker });
  return {
    name: marker.ok ? "mark.success" : "mark.failure",
    node: {
      startIndex: marker.position.start,
      endIndex: marker.position.end,
    },
  };
};

export type LibError = {
  message: string;
  position: { start: number; end: number };
};

export type CMError = {
  message: string;
  severity: string;
  start: number;
  end: number;
};

export const convertErrorLegacy = (error: LibError) => {
  return {
    message: error.message,
    severity: "error",
    start: error.position.start,
    end: error.position.end,
  };
};

export const convertError = (error: LibError) => {
  console.log({ error });
  return {
    name: "mark.error",
    node: {
      startIndex: error.position.start,
      endIndex: error.position.end,
    },
  };
};

export type Range = {
  name: string;
  node: {
    startIndex: number;
    endIndex: number;
  };
};

export type Result<A, E> = { ok: true; value: A } | { ok: false; error: E };

export type AuthorizerError = {
  authorizer: Array<LibError>;
  blocks: Array<Array<LibError>>;
  root_key?: string;
  token?: string;
};

export type Fact = {
  name: string;
  terms: Array<string>;
};

export type FailedCheck =
  | {
      type: "block";
      value: { block_id: number; check_id: number; rule: string };
    }
  | { type: "authorizer"; value: { check_id: number; rule: string } };

export type MatchedPolicy =
  | { type: "allow"; value: number }
  | { type: "deny"; value: number };

export type LogicError =
  | {
      type: "unauthorized";
      value: { policy: MatchedPolicy; checks: Array<FailedCheck> };
    }
  | { type: "no_matching_policy"; value: { checks: Array<FailedCheck> } }
  | { type: "invalid_block_rule"; value: [number, string] }
  | { type: "authorizer_not_empty" };

export type FormatError =
  | { type: "invalid_key_size"; value: number }
  | {
      type:
        | "signature"
        | "sealed_signature"
        | "empty_keys"
        | "unknown_public_key"
        | "deserialization_error"
        | "serialization_error"
        | "block_deserialization_error"
        | "block_serialization_error"
        | "version"
        | "invalid_signature_size"
        | "invalid_key"
        | "signature_deserialization_error"
        | "block_signature_deserialization_error"
        | "invalid_block_id"
        | "existing_public_key"
        | "symbol_table_overlap"
        | "public_key_table_overlap"
        | "unknown_external_key"
        | "unknown_symbol"
        | "token_limit"
        | "block_limit"
        | "pkcs8";
      value?: unknown;
    };

export type TokenError =
  | { type: "failed_logic"; value: LogicError }
  | { type: "format"; value: FormatError }
  | {
      type:
        | "internal_error"
        | "append_on_sealed"
        | "already_sealed"
        | "language"
        | "run_limit"
        | "conversion_error"
        | "base64"
        | "execution";
      value?: unknown;
    };

export type AuthorizerResult = {
  authorizer_editor: {
    markers: Array<LibMarker>;
  };
  authorizer_result: Result<number, TokenError>;
  authorizer_world: Array<Fact>;
  token_blocks: Array<{ markers: Array<LibMarker> }>;
  query_result?: QueryResult;
};

export type GeneratorError =
  | { type: "parse"; value: { blocks: Array<Array<LibError>> } }
  | { type: "biscuit"; value: TokenError }
  | { type: "key_pair_error"; value: FormatError };

export type AttenuationError =
  | { type: "block_parse_errors"; value: { blocks: Array<Array<LibError>> } }
  | { type: "biscuit"; value: TokenError };

export function trimLines(str: string) {
  return str
    .trim()
    .split("\n")
    .map((line: string) => line.trim())
    .join("\n");
}

export type SnapshotInspectionResult = {
  snapshot: Result<SnapshotData, TokenError>;
};

export type SnapshotData = {
  code: string;
  iterations: number;
  elapsed_micros?: bigint;
  steps: number;
  authorization_result: Result<number, TokenError>;
  query_result?: QueryResult;
};

export type QueryResult = {
  facts: Result<Array<Fact>, TokenError>;
  elapsed_micros?: bigint;
  steps: number;
};
