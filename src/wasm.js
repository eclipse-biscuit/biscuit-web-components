/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import init from "./biscuit-wasm/biscuit.js";

let loadPromise = null;
export async function initialize() {
  if (loadPromise == null) {
    console.log("will create wasm promise");
    loadPromise = init();
  }
  console.log("returning wasm promise");

  return loadPromise;
}
