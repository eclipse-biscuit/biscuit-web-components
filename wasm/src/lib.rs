/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
use biscuit_auth::{builder, error, Authorizer};
use log::*;
use nom::Offset;
use serde::{Deserialize, Serialize};
use std::default::Default;
use wasm_bindgen::prelude::*;

mod attenuate;
mod execute;
mod execute_serialized;
mod generate_token;
mod parse_snapshot;
mod parse_token;

mod js_result {
    use serde::{de, ser::SerializeStruct, Deserialize, Deserializer, Serialize, Serializer};

    pub fn serialize<T: Serialize, E: Serialize, S: Serializer>(
        result: &Result<T, E>,
        serializer: S,
    ) -> Result<S::Ok, S::Error> {
        let mut s = serializer.serialize_struct("Result", 2)?;
        match result {
            Ok(value) => {
                s.serialize_field("ok", &true)?;
                s.serialize_field("value", value)?;
            }
            Err(error) => {
                s.serialize_field("ok", &false)?;
                s.serialize_field("error", error)?;
            }
        }
        s.end()
    }

    #[derive(Deserialize)]
    struct Repr<T, E> {
        ok: bool,
        value: Option<T>,
        error: Option<E>,
    }

    pub fn deserialize<'de, T: Deserialize<'de>, E: Deserialize<'de>, D: Deserializer<'de>>(
        deserializer: D,
    ) -> Result<Result<T, E>, D::Error> {
        match Repr::<T, E>::deserialize(deserializer)? {
            Repr {
                ok: true,
                value: Some(value),
                ..
            } => Ok(Ok(value)),
            Repr {
                ok: false,
                error: Some(error),
                ..
            } => Ok(Err(error)),
            _ => Err(de::Error::custom(
                "expected `{ ok: true, value }` or `{ ok: false, error }`",
            )),
        }
    }

    pub fn to_js_value<T: Serialize, E: Serialize>(result: &Result<T, E>) -> wasm_bindgen::JsValue {
        serialize(result, &serde_wasm_bindgen::Serializer::new()).unwrap()
    }
}
pub use attenuate::attenuate_token;
pub use execute::execute;
pub use generate_token::generate_token;
pub use parse_snapshot::inspect_snapshot;
pub use parse_token::parse_token;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn error_message(error: JsValue) -> Option<String> {
    serde_wasm_bindgen::from_value::<error::Token>(error)
        .ok()
        .map(|e| e.to_string())
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Editor {
    pub markers: Vec<Marker>,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Marker {
    pub ok: bool,
    pub position: SourcePosition,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct ParseError {
    pub message: String,
    pub position: SourcePosition,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct ParseErrors {
    pub blocks: Vec<Vec<ParseError>>,
    pub authorizer: Vec<ParseError>,
}

impl ParseErrors {
    pub fn new() -> ParseErrors {
        ParseErrors {
            blocks: Vec::new(),
            authorizer: Vec::new(),
        }
    }
}

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
pub struct SourcePosition {
    pub start: usize,
    pub end: usize,
}

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
pub struct Fact {
    pub name: String,
    pub terms: Vec<String>,
}

impl From<builder::Fact> for Fact {
    fn from(value: builder::Fact) -> Self {
        Fact {
            name: value.predicate.name,
            terms: value
                .predicate
                .terms
                .iter()
                .map(|t| t.to_string())
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    #[serde(with = "crate::js_result")]
    pub facts: Result<Vec<Fact>, error::Token>,
    pub elapsed_micros: Option<u128>,
    pub steps: u64,
}

/// runs a query on the authorizer, only counting the time and steps
/// spent on the query itself
pub fn run_query(authorizer: &mut Authorizer, query: &str) -> QueryResult {
    let steps_before = authorizer.elapsed_steps();
    let time_before = authorizer.execution_time().map_or(0, |t| t.as_micros());
    let facts = authorizer.query(query);
    QueryResult {
        facts,
        elapsed_micros: authorizer
            .execution_time()
            .map(|t| t.as_micros().saturating_sub(time_before)),
        steps: authorizer.elapsed_steps().saturating_sub(steps_before),
    }
}

#[wasm_bindgen(start)]
pub fn run_app() {
    wasm_logger::init(wasm_logger::Config::default());
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));

    log("wasm run_app")
}

// based on nom's convert_error
fn get_position(input: &str, span: &str) -> SourcePosition {
    let offset = input.offset(span);
    let start = offset;

    let offset = offset + span.len();
    let end = offset;

    SourcePosition { start, end }
}

fn get_parse_errors(input: &str, errors: &[biscuit_auth::parser::Error]) -> Vec<ParseError> {
    let mut res = Vec::new();

    error!("got errors: {:?}", errors);
    for e in errors.iter() {
        let position = get_position(input, e.input);
        let message = e
            .message
            .as_ref()
            .cloned()
            .unwrap_or_else(|| format!("error: {:?}", e.code));

        error!(
            "position for error({:?}) \"{}\": {:?}",
            e.code, message, position
        );
        res.push(ParseError { message, position });
    }

    res
}
