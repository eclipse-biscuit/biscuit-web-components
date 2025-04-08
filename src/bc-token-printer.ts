/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./bc-datalog-editor";
import { initialize } from "./wasm.js";
import {
  execute_serialized,
  parse_token,
  attenuate_token,
} from "@biscuit-auth/biscuit-wasm-support";
import {
  AuthorizerError,
  AuthorizerResult,
  LibError,
  LibMarker,
  Result,
  convertMarker,
  convertError,
  trimLines,
} from "./lib/adapters";

/**
 * TODO DOCS
 */
@customElement("bc-token-printer")
export class BcTokenPrinter extends LitElement {
  @property()
  biscuit = "";

  @property()
  readonly = false;

  @property()
  showAuthorizer = false;

  @property()
  authorizer = "";

  @property()
  rootPublicKey = "";

  @property()
  showAttenuation = false;

  @state()
  extraBlocks: Array<string> = [];

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

  _onUpdatedToken(e: InputEvent) {
    if (this.readonly) return;
    this.biscuit = (e.target as HTMLInputElement).value.trim();
  }

  _onUpdatedPublicKey(e: InputEvent) {
    this.rootPublicKey = (e.target as HTMLInputElement).value.trim();
  }

  _onUpdatedAuthorizer(e: { detail: { code: string } }) {
    if (!this.showAuthorizer) return;
    this.authorizer = e.detail.code;
  }

  _onUpdatedExtraBlock(blockId: number, e: { detail: { code: string } }) {
    const newBlocks = [...this.extraBlocks];
    newBlocks[blockId] = e.detail.code;
    this.extraBlocks = newBlocks;
  }

  _addExtraBlock() {
    const newBlocks = [...this.extraBlocks].filter((b) => b !== "");
    newBlocks.push("");
    this.extraBlocks = newBlocks;
  }

  renderTokenInput() {
    if (this.readonly) {
      return html`
        <div class="code">
          <p>Encoded token</p>
          <code>${this.biscuit}</code>
        </div>
      `;
    }
    return html`
      <div class="code">
        <p>Encoded token</p>
        <textarea @input=${this._onUpdatedToken}>${this.biscuit}</textarea>
      </div>
    `;
  }

  renderNotStarted() {
    return html`
      <div class="token">
        ${this.renderTokenInput()}
        <div class="content">loading biscuit token</div>
      </div>
    `;
  }

  renderEmptyToken() {
    return html`
      ${this.renderTokenInput()}
      <div class="content">Please enter a base64-encoded token</div>
    `;
  }

  renderResult(
    error: string,
    blocks: Array<{
      code: string;
      revocation_id: string;
      external_key?: string;
    }>,
    blockMarkers: Array<LibMarker>
  ) {
    if (this.biscuit === "") {
      return html`
        ${this.renderTokenInput()}
        <div class="content">Please enter a base64-encoded token</div>
      `;
    }

    if (error) {
      return html`
        ${this.renderTokenInput()}
        <div class="content">${error}</div>
      `;
    }

    return html`
      ${this.renderTokenInput()}
      <div class="content">
        <p>Decoded token</p>
        ${blocks.map(
          (block, index) => html`
        <div>
        <p>${index === 0 ? "Authority block" : `Block ${index}`}:</p>
        <p class="revocation-id">Revocation id: <span class="id">${
          block.revocation_id
        }</span></p>
        <p class="external-key">Signed by: <span class="id">${
          block.external_key ?? "n/a"
        }</span></p>
        <bc-datalog-editor
          code=${block.code}
          .marks=${blockMarkers[index] ?? []}
          readonly="true"
        </bc-datalog-editor>
        </div>
      `
        )}
      </div>
    `;
  }

  renderAuthorizer(result: Result<AuthorizerResult, AuthorizerError>) {
    if (!this.showAuthorizer) return;

    const markers = result.Ok?.authorizer_editor.markers ?? [];
    const errors = result.Err?.authorizer ?? [];

    return html`
      <div class="code">
        <p class="public-key-input">
          <label for="public-key">Public key</label>
          <input
            @input=${this._onUpdatedPublicKey}
            id="public-key"
            value="${this.rootPublicKey}"
          />
        </p>
        <p>Authorizer</p>
        <bc-authorizer-editor
          code="${this.authorizer}"
          .markers=${markers.map(convertMarker)}
          .parseErrors=${errors.map(convertError)}
          @bc-authorizer-editor:update=${this._onUpdatedAuthorizer}
        >
        </bc-authorizer-editor>
      </div>
      <div class="content">
        <p>Result</p>
        ${this.renderAuthorizerResult(result)}
      </div>
    `;
  }

  renderAuthorizerResult(result: Result<AuthorizerResult, AuthorizerError>) {
    if (this.biscuit === "") {
      return html`<div><pre>Please enter a base64-encoded token</pre></div>`;
    }
    if (this.rootPublicKey === "") {
      return html`<div><pre>Please enter a public key</pre></div>`;
    }
    return html`<bc-authorizer-result
      .content=${result}
    ></bc-authorizer-result>`;
  }

  renderExtraBlock(
    blockId: number,
    errors: Array<LibError> = [],
    blocksOffset: number
  ) {
    return html`
      <p>${"Block " + (blocksOffset + blockId)}:</p>
      <bc-datalog-editor
        code="${this.extraBlocks[blockId] ?? ""}"
        .marks=${errors.map(convertError)}
        @bc-datalog-editor:update=${(e: { detail: { code: string } }) =>
          this._onUpdatedExtraBlock(blockId, e)}
      >
      </bc-datalog-editor>
    `;
  }

  renderAttenuation(blocksOffset: number) {
    if (!this.showAttenuation) return;

    const result = attenuate_token({
      token: this.biscuit,
      blocks: this.extraBlocks.filter((b) => b !== ""),
    });

    const blocksWithErrors: Array<number> = [];
    (result.Err?.BlockParseErrors?.blocks ?? []).forEach(
      (errors: Array<LibError>, bId: number) => {
        if (errors.length > 0) {
          blocksWithErrors.push(bId);
        }
      }
    );

    let errorMessage = "An error has happened";

    if (blocksWithErrors.length > 0) {
      const blockList = blocksWithErrors
        .map((bId) => (bId + blocksOffset).toString())
        .join(", ");
      errorMessage =
        "Please correct the datalog input on the following blocks: " +
        blockList;
    }

    let attenuated;
    if (this.biscuit == "") {
      attenuated = html`Please enter a base64-encoded token`;
    } else {
      attenuated = result.Ok ?? errorMessage;
    }

    return html`
      <div class="code">
        <p>Extra blocks</p>
        ${this.extraBlocks.map((_, id) => {
          const blockErrors = result.Err?.BlockParseErrors?.blocks[id] ?? [];
          return this.renderExtraBlock(id, blockErrors, blocksOffset);
        })}
        <button @click=${this._addExtraBlock}>Add block</button>
      </div>
      <div class="content">
        <p>Attenuated token</p>
        <code>${attenuated}</code>
      </div>
    `;
  }

  render() {
    if (!this._started) return this.renderNotStarted();

    const parseResult = parse_token({ data: this.biscuit });
    const blocks = parseResult.token_blocks.map((code: string, i: number) => ({
      code,
      revocation_id: parseResult.revocation_ids[i],
      external_key: parseResult.external_keys[i],
    }));
    const authorizerQuery = {
      token: this.biscuit,
      root_public_key: this.rootPublicKey,
      authorizer_code: this.authorizer,
      query: "",
    };
    const authorizerResult = execute_serialized(authorizerQuery);
    const blockMarkers =
      authorizerResult.Ok?.token_blocks.map(
        (b: { markers: Array<LibMarker> }) => b.markers.map(convertMarker)
      ) ?? [];

    // Extra blocks numbers are offset by the amount of blocks already in the token
    const blocksOffset = blocks.length;

    return html`
      <div class="row">
        ${this.renderResult(
          parseResult.error,
          blocks,
          this.showAuthorizer ? blockMarkers : []
        )}
      </div>
      <div class="row">${this.renderAuthorizer(authorizerResult)}</div>
      <div class="row">${this.renderAttenuation(blocksOffset)}</div>
    `;
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
