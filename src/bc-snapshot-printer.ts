/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./bc-datalog-editor";
import { initialize } from "./wasm.js";
import { inspect_snapshot } from "@biscuit-auth/biscuit-wasm-support";
import {
  AuthorizerError,
  AuthorizerResult,
  Fact,
  LogicError,
  Result,
  SnapshotInspectionResult,
  trimLines,
} from "./lib/adapters";

/**
 * TODO DOCS
 */
@customElement("bc-snapshot-printer")
export class BcSnapshotPrinter extends LitElement {
  @property()
  snapshot = "";

  @property()
  readonly = false;

  @property()
  showQuery = false;

  @property()
  authorizer = "";

  @property()
  query = "";

  @state()
  _started = false;

  constructor() {
    super();
    const authorizerChild = this.querySelector(".authorizer");
    if (authorizerChild !== null) {
      this.authorizer = trimLines(authorizerChild.textContent ?? "");
    }
  }

  firstUpdated() {
    initialize().then(() => (this._started = true));
  }

  _onUpdatedSnapshot(e: InputEvent) {
    if (this.readonly) return;
    this.snapshot = (e.target as HTMLInputElement).value.trim();
  }

  _onUpdatedQuery(e: { detail: { code: string } }) {
    if (!this.showQuery) return;
    this.query = e.detail.code;
  }

  renderSnapshotInput() {
    if (this.readonly) {
      return html`
        <div class="code">
          <p>Encoded snapshot</p>
          <code>${this.snapshot}</code>
        </div>
      `;
    }
    return html`
      <div class="code">
        <p>Encoded snapshot</p>
        <textarea @input=${this._onUpdatedSnapshot}>${this.snapshot}</textarea>
      </div>
    `;
  }

  renderNotStarted() {
    return html`
      <div class="snapshot">
        ${this.renderSnapshotInput()}
        <div class="content">loading biscuit snapshot</div>
      </div>
    `;
  }

  renderEmptyToken() {
    return html`
      ${this.renderSnapshotInput()}
      <div class="content">Please enter a base64-encoded snapshot</div>
    `;
  }

  renderResult(result: SnapshotInspectionResult) {
    if (this.snapshot === "") {
      return html`
        ${this.renderSnapshotInput()}
        <div class="content">Please enter a base64-encoded snapshot</div>
      `;
    }

    if (result.snapshot.Err) {
      return html`
        ${this.renderSnapshotInput()}
        <div class="content">${result.snapshot.Err}</div>
      `;
    }

    const {
      code,
      elapsed_micros,
      iterations,
      authorization_result,
      query_result,
    } = result.snapshot.Ok!;

    const auth_res: Result<AuthorizerResult, AuthorizerError> = {
      Ok: {
        authorizer_editor: { markers: [] },
        authorizer_result: authorization_result,
        authorizer_world: [],
        token_blocks: [],
      },
    };

    return html`
      ${this.renderSnapshotInput()}
      <div class="content">
        <p>Elapsed time: ${this.renderDuration(elapsed_micros)}</p>
        <p>Iterations: ${iterations}</p>
        <p>Snapshot contents</p>
        <bc-datalog-editor code=${code} .marks=${[]} readonly="true">
        </bc-datalog-editor>
        <bc-authorizer-result .content=${auth_res}></bc-authorizer-result>
        ${this.renderQueryInput()}
        ${query_result && this.renderQueryResult(query_result)}
      </div>
    `;
  }

  renderDuration(micros?: bigint) {
    if (micros === undefined) {
      return "n/a";
    }

    return `${micros}μs`;
  }

  renderQueryInput() {
    if (!this.showQuery) return;

    return html`
      <p>Query snapshot</p>
      <bc-datalog-editor
        @bc-datalog-editor:update=${(e: { detail: { code: string } }) =>
          this._onUpdatedQuery(e)}
      >
      </bc-datalog-editor>
    `;
  }

  renderQueryResult(result: Result<Array<Fact>, LogicError>) {
    if (result.Err) {
      console.error(result.Err);
      return html`<p>error</p>`;
    } else {
      return html`<bc-authorizer-content .content=${result.Ok!}>
      </bc-authorizer-content>`;
    }
  }

  render() {
    if (!this._started) return this.renderNotStarted();
    const inspectQuery = {
      data: this.snapshot,
      extra_authorizer: this.authorizer != "" ? this.authorizer : undefined,
      query: this.query != "" ? this.query : undefined,
    };
    const parseResult = inspect_snapshot(inspectQuery);

    return html` <div class="row">${this.renderResult(parseResult)}</div> `;
  }

  static styles = css`
    .row {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .public-key-input {
      display: flex;
    }

    .public-key-input label {
      height: 1.5em;
    }

    #public-key {
      margin-left: 1em;
      flex-grow: 1;
    }

    @media (prefers-color-scheme: dark) {
      .row {
        color: #dee2e6;
        background: #131314;
      }
      textarea {
        color: #dee2e6;
        background: #131314;
      }
    }

    @media (prefers-color-scheme: light) {
      .row {
        color: #1d2d35;
        background: #fff;
      }
    }

    @media (min-width: 576px) {
      .row {
        display: flex;
        flex-flow: row wrap;
        flex-direction: row;
      }

      .code {
        order: 1;
        width: 49%;
      }

      .content {
        order: 2;
        width: 49%;
      }
    }

    code {
      overflow-wrap: anywhere;
      padding: 0.2em;
      padding-top: 1em;
    }

    .code {
      border: 1px rgba(128, 128, 128, 0.4) solid;
      display: flex;
      flex-direction: column;
    }

    textarea {
      flex-grow: 1;
      border: 0;
    }

    .content {
      border-top: 1px rgba(128, 128, 128, 0.4) solid;
      border-right: 1px rgba(128, 128, 128, 0.4) solid;
    }

    p {
      border-bottom: 1px rgba(128, 128, 128, 0.4) solid;
      margin-block-start: 0px;
      margin-block-end: 0px;
      padding: 0.2em;
      font-size: 0.8em;
    }

    .revocation-id,
    .external-key {
      overflow: hidden;
      diplay: inline-block;
      text-overflow: ellipsis;
      max-width: 100;
    }

    .revocation-id,
    .external-key > .id {
      user-select: all;
    }

    .content code {
      user-select: all;
    }

    bc-datalog-editor {
      border-bottom: 1px rgba(128, 128, 128, 0.4) solid;
    }
  `;
}
