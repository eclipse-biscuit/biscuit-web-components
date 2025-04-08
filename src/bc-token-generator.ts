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
  generate_token,
  generate_keypair,
  generate_ecdsa_keypair,
  get_public_key,
} from "@biscuit-auth/biscuit-wasm-support";
import {
  LibError,
  Result,
  convertError,
  GeneratorError,
  trimLines,
} from "./lib/adapters";

/**
 * TODO DOCS
 */
@customElement("bc-token-generator")
export class BcTokenGenerator extends LitElement {
  @property()
  privateKey = "";

  @state()
  _alg = "ed25519";

  @state()
  _blocks: Array<{ code: string; externalKey: string | null }> = [];

  @state()
  _started = false;

  constructor() {
    super();
    console.log("constructor");
    const blockChildren = this.querySelectorAll(".block");
    console.log({ blockChildren });
    this._blocks = Array.from(blockChildren)
      .map((b, i) => {
        const code = trimLines(b.textContent ?? "");
        let externalKey = null;
        if (i > 0) {
          externalKey = b.getAttribute("privateKey");
        }
        return { code, externalKey };
      })
      .filter(({ code }, i) => i === 0 || code !== "");
    if (this._blocks.length === 0) {
      this._blocks = [{ code: "", externalKey: null }];
    }
  }

  firstUpdated() {
    initialize().then(() => (this._started = true));
  }

  _onUpdatedAlg(e: { target: HTMLSelectElement }) {
    const alg = e.target.selectedOptions[0]?.value;
    if (alg) {
      this._alg = alg;
    }
  }

  _onUpdatedBlock(blockId: number, e: { detail: { code: string } }) {
    const newBlocks = [...this._blocks];
    newBlocks[blockId] = {
      code: e.detail.code,
      externalKey: this._blocks[blockId].externalKey,
    };
    this._blocks = newBlocks;
  }

  _onUpdatedBlockKey(blockId: number, e: InputEvent) {
    const newBlocks = [...this._blocks];
    newBlocks[blockId] = {
      code: this._blocks[blockId].code,
      externalKey: (e.target as HTMLInputElement).value.trim(),
    };
    this._blocks = newBlocks;
  }

  generateKey() {
    if (this._alg == "secp256r1") {
      const { private_key } = generate_ecdsa_keypair();
      this.privateKey = private_key;
    } else {
      const { private_key } = generate_keypair();
      this.privateKey = private_key;
    }
  }

  addBlock() {
    const newBlocks = [...this._blocks];
    newBlocks.push({ code: "", externalKey: null });
    this._blocks = newBlocks;
  }

  renderNotStarted() {
    return html`
      <div class="row">
        <div class="content">loading biscuit generator</div>
      </div>
    `;
  }

  renderKeyInput() {
    const publicKey = this.privateKey && get_public_key(this.privateKey);
    return html`
      <div class="row">
        <p>
          <label for="private-key">Private key</label>
          <input id="private-key" value="${this.privateKey}" /><br />
          <label for="public-key">Public key</label>
          <input id="public-key" value="${publicKey}" readonly disabled /><br />
          <button @click=${this.generateKey}>Generate key</button>
          <select @change=${this._onUpdatedAlg}>
            <option value="ed25519">ed25519</option>
            <option value="secp256r1">secp256r1</option>
          </select>
        </p>
      </div>
    `;
  }

  renderBlockKeyInput(blockId: number) {
    if (blockId <= 0) return;

    return html`<input
      @input=${(e: InputEvent) => this._onUpdatedBlockKey(blockId, e)}
      placeholder="Third party private key"
    />`;
  }

  renderBlock(blockId: number, errors: Array<LibError> = []) {
    return html`
      <p>${blockId == 0 ? "Authority block" : "Block " + blockId}:</p>
      ${this.renderBlockKeyInput(blockId)}
      <bc-datalog-editor
        code="${this._blocks[blockId]?.code ?? ""}"
        .marks=${errors.map(convertError)}
        @bc-datalog-editor:update=${(e: { detail: { code: string } }) =>
          this._onUpdatedBlock(blockId, e)}
      >
      </bc-datalog-editor>
    `;
  }

  render() {
    if (!this._started) return this.renderNotStarted();

    const nonEmptyBlocks = this._blocks.filter(({ code }) => code !== "");

    const query = {
      token_blocks: nonEmptyBlocks.map(({ code }) => code),
      private_key: this.privateKey,
      external_private_keys: nonEmptyBlocks.map(
        ({ externalKey }) => externalKey
      ),
    };

    let result: Result<string, GeneratorError>;

    try {
      result = {
        Ok: generate_token(query),
      };
    } catch (error) {
      result = { Err: error as GeneratorError };
    }

    const blocksWithErrors: Array<number> = [];
    (result.Err?.Parse?.blocks ?? []).forEach(
      (errors: Array<LibError>, bId: number) => {
        if (errors.length > 0) {
          blocksWithErrors.push(bId);
        }
      }
    );

    let errorMessage = "Please correct the datalog input";

    if (result.Err?.Biscuit === "InternalError") {
      errorMessage = "Please provide an authority block";
    } else if (
      typeof result.Err?.Biscuit === "object" &&
      result.Err?.Biscuit?.Format?.InvalidKeySize !== undefined
    ) {
      errorMessage = "Please enter (or generate) a valid private key";
    } else if (blocksWithErrors.length > 0) {
      const blockList = blocksWithErrors
        .map((bId) => (bId === 0 ? "authority" : bId.toString()))
        .join(", ");
      errorMessage =
        "Please correct the datalog input on the following blocks: " +
        blockList;
    }

    const token = result.Ok ?? errorMessage;

    return html`
      <div class="row">
        <div class="code">
          ${this.renderKeyInput()}
          ${this._blocks.map((code, id) => {
            const blockErrors = result.Err?.Parse?.blocks[id] ?? [];
            return this.renderBlock(id, blockErrors);
          })}
          <button @click=${this.addBlock}>Add block</button>
        </div>
        <div class="content">
          <p>Generated token</p>
          <code>${token}</code>
        </div>
      </div>
    `;
  }

  static styles = css`
    .row {
      display: flex;
      flex-direction: column;
      text-align: left;
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

    .content code {
      user-select: all;
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

    bc-datalog-editor {
      border-bottom: 1px rgba(128, 128, 128, 0.4) solid;
    }
  `;
}
