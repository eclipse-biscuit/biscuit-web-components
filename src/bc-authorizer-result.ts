/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  Result,
  AuthorizerResult,
  AuthorizerError,
  LogicError,
} from "./lib/adapters";

/**
 * TODO DOCS
 */
@customElement("bc-authorizer-result")
export class BcAuthorizerResult extends LitElement {
  @property({ type: Object })
  content?: Result<AuthorizerResult, AuthorizerError>;

  renderLogicError(e: LogicError) {
    const failedChecksCount =
      e.Unauthorized?.checks.length ?? e.NoMatchingPolicy?.checks.length ?? 0;
    const failedChecks =
      failedChecksCount > 0
        ? html`<pre>${failedChecksCount} failed checks</pre>`
        : null;
    let policyError;
    if (e.NoMatchingPolicy) {
      policyError = html`<pre>No policy matched</pre>`;
    } else if (e.Unauthorized && e.Unauthorized.policy.Deny !== undefined) {
      policyError = html`<pre>A deny policy matched</pre>`;
    }

    return html`<div>${failedChecks} ${policyError}</div>`;
  }

  renderResult() {
    const logicError = this.content?.Ok?.authorizer_result?.Err?.FailedLogic;
    const parsingError = this.content?.Err?.token;
    const publicKeyError = this.content?.Err?.root_key;
    const success = this.content?.Ok?.authorizer_result?.Ok !== undefined;
    if (success) {
      return html`<div><pre>Success</pre></div>`;
    } else if (logicError) {
      return this.renderLogicError(logicError);
    } else if (publicKeyError) {
      return html`<div><pre>Public key parsing error</pre></div>`;
    } else if (parsingError) {
      return html`<div><pre>Token parsing error</pre></div>`;
    } else if (this.content?.Err) {
      return html`<div><pre>Datalog execution error</pre></div>`;
    } else {
      console.error(this.content);
      return html`<div><pre>Unknown error</pre></div>`;
    }
  }

  render() {
    if (this.content === null) {
      return html` <div><pre>no result yet</pre></div> `;
    } else {
      return this.renderResult();
    }
  }

  static get styles() {
    return [
      // language=CSS
      css`
        :host {
          display: block;
        }
      `,
    ];
  }
}
