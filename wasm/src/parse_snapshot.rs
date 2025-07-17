/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
use crate::Fact;
use biscuit_auth::{datalog::RunLimits, error, Authorizer};
use serde::{Deserialize, Serialize};
use std::{default::Default, time::Duration};
use wasm_bindgen::prelude::*;

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
struct InspectSnapshotQuery {
    pub data: String,
    pub query: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct InspectionResult {
    pub snapshot: Result<ParseResult, error::Token>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ParseResult {
    pub code: String,
    pub iterations: u64,
    pub elapsed_micros: Option<u128>,
    pub authorization_result: Result<usize, error::Token>,
    pub query_result: Option<Result<Vec<Fact>, error::Token>>,
}

#[wasm_bindgen]
pub fn inspect_snapshot(query: &JsValue) -> JsValue {
    let query = serde_wasm_bindgen::from_value(query.clone()).unwrap();

    let result = InspectionResult {
        snapshot: inspect_snapshot_inner(query),
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

fn inspect_snapshot_inner(query: InspectSnapshotQuery) -> Result<ParseResult, error::Token> {
    let mut authorizer = Authorizer::from_base64_snapshot(&query.data)?;
    let code = authorizer.to_string();
    let iterations = authorizer.iterations();
    let elapsed_micros = authorizer.execution_time().map(|d| d.as_micros());

    let authorization_result = {
        authorizer.authorize_with_limits(RunLimits {
            max_time: Duration::from_millis(100),
            ..Default::default()
        })
    };

    let query_result = query.query.map(|q| authorizer.query(q.as_str()));

    Ok(ParseResult {
        code,
        iterations,
        elapsed_micros,
        authorization_result,
        query_result,
    })
}
