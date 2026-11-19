/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { html } from "lit";
import { QueryResult } from "./adapters";

export function renderDuration(micros?: bigint) {
  if (micros === undefined) {
    return "n/a";
  }

  return `${micros}μs`;
}

export function renderQueryResult({
  facts,
  elapsed_micros,
  steps,
}: QueryResult) {
  const stats = html`
    <p>Query elapsed time: ${renderDuration(elapsed_micros)}</p>
    <p>Query steps: ${steps}</p>
  `;
  if (!facts.ok) {
    console.error(facts.error);
    return html`${stats}
      <p>error</p>`;
  } else {
    return html`${stats}<bc-authorizer-content .content=${facts.value}>
      </bc-authorizer-content>`;
  }
}
