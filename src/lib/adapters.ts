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

export type Result<A, E> = {
  Ok?: A;
  Err?: E;
};

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

export type Check = {
  Block: {
    block_id: number;
    check_id: number;
    rule: string;
  };
};

export type LogicError = {
  Unauthorized?: {
    checks: Array<Check>;
    policy: { Allow?: number; Deny?: number };
  };
  NoMatchingPolicy?: {
    checks: Array<Check>;
  };
};

export type AuthorizerResult = {
  authorizer_editor: {
    markers: Array<LibMarker>;
  };
  authorizer_result: Result<
    number,
    {
      FailedLogic?: LogicError;
    }
  >;
  authorizer_world: Array<Fact>;
  token_blocks: Array<{ markers: Array<LibMarker> }>;
};

export type GeneratorError = {
  Biscuit?: "InternalError" | { Format?: { InvalidKeySize?: number } };
  Parse?: {
    blocks: Array<Array<LibError>>;
  };
};

export type AttenuactionError = {
  Biscuit?: { Format?: { InvalidKeySize?: number } };
  BlockParseErrors?: {
    blocks: Array<Array<LibError>>;
  };
};

export function trimLines(str: string) {
  return str
    .trim()
    .split("\n")
    .map((line: string) => line.trim())
    .join("\n");
}

export type SnapshotInspectionResult = {
  snapshot: Result<SnapshotData, LogicError>;
};

export type SnapshotData = {
  code: string;
  iterations: number;
  elapsed_micros?: bigint;
  authorization_result: Result<number, { FailedLogic?: LogicError }>;
  query_result?: Result<Array<Fact>, LogicError>;
};
