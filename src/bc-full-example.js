/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { dispatchCustomEvent } from "../src/lib/events.js";
import { execute, parse_token } from "@biscuit-auth/biscuit-wasm-support";
import "./bc-authorizer-editor.js";
import "./bc-authorizer-result";
import "./bc-authorizer-content.js";
import { initialize } from "./wasm.js";

/**
 * TODO DOCS
 */
export class BcFullExample extends LitElement {
  static get properties() {
    return {
      blocks: { type: Array },
      _authorizer: { type: String },

      _started: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.blocks = [];

    for (let block of this.querySelectorAll(".block")) {
      console.log("block: " + block.innerHTML);
      this.blocks.push({ code: block.innerHTML });
    }

    let auth = this.querySelector(".authorizer");
    if (auth !== null) {
      this._authorizer = auth.innerHTML;
    }
    console.log("authorizer: " + this._authorizer);

    this._started = false;
  }

  _onUpdatedBlock(index, code) {
    console.log("full::_onUpdatedCode");
    console.log(code);
    this.blocks[index].code = code;
    console.log(this.blocks);
    dispatchCustomEvent(this, "update", { blocks: this.blocks });
    this.requestUpdate();
  }

  _onUpdatedAuthorizer(code) {
    this._authorizer = code;
    dispatchCustomEvent(this, "update", { _authorizer: code });
    this.requestUpdate();
  }

  firstUpdated(changedProperties) {
    initialize().then(() => {
      console.log("start");
      this._started = true;
    });
  }

  update(changedProperties) {
    super.update(changedProperties);
  }

  render() {
    console.log("render0");
    if (!this._started) {
      return html``;
    }

    console.log(this.blocks);
    let blocks = [];
    for (let b of this.blocks) {
      blocks.push(b.code);
    }
    var state = {
      token_blocks: blocks,
      authorizer_code: this._authorizer,
      query: "",
      external_private_keys: [],
    };

    console.log("WILL EXECUTE");
    var result = execute(state);
    console.log(result);

    var parseErrors = [];
    var markers = [];
    var authorizer_result = "";
    var authorizer_world = [];
    var blockParseErrors = [];
    var blockMarkers = [];

    // handle parse errors
    if (result.Ok === undefined) {
      for (let b of result.Err.blocks) {
        var errors = [];
        var marks = [];
        for (let error of b) {
          errors.push({
            message: error.message,
            severity: "error",
            start: error.position.start,
            end: error.position.end,
          });
        }
        blockParseErrors.push(errors);
      }

      for (let error of result.Err.authorizer) {
        parseErrors.push({
          message: error.message,
          severity: "error",
          start: error.position.start,
          end: error.position.end,
        });
      }
    } else {
      for (let b of result.Ok.token_blocks) {
        var marks = [];

        for (let marker of b.markers) {
          marks.push({
            start: marker.position.start,
            end: marker.position.end,
            ok: marker.ok,
          });
        }

        blockMarkers.push(marks);
      }

      for (let marker of result.Ok.authorizer_editor.markers) {
        console.log(marker);
        markers.push({
          start: marker.position.start,
          end: marker.position.end,
          ok: marker.ok,
        });
      }
    }

    authorizer_world = result.Ok?.authorizer_world ?? [];
    authorizer_result = result.Ok?.authorizer_result ?? null;

    return html`
      <div class="blocks">
        <p>Token</p>
        ${this.blocks.map(
          (block, index) => html`
            <p>Block ${index}</p>
            <bc-datalog-editor
              code=${block.code}
              .marks=${blockMarkers[index].concat(blockParseErrors[index])}
              @bc-datalog-editor:update="${(e) => {
                this._onUpdatedBlock(index, e.detail.code);
              }}"
              }
            >
            </bc-datalog-editor>
          `
        )}
      </div>

      <div class="authorizer">
        <p>Authorizer policies</p>
        <bc-authorizer-editor
          code="${this._authorizer}"
          parseErrors="${JSON.stringify(parseErrors)}"
          markers="${JSON.stringify(markers)}"
          @bc-authorizer-editor:update="${(e) => {
            this._onUpdatedAuthorizer(e.detail.code);
          }}"
          }
        >
        </bc-authorizer-editor>

        <em>Execution result</em>
        <bc-authorizer-result .content=${result}></bc-authorizer-result>
        <details>
          <summary>Facts</summary>
          <bc-authorizer-content
            content="${JSON.stringify(authorizer_world)}"
          ></bc-authorizer-content>
        </details>
      </div>
    `;
  }

  static get styles() {
    return [
      // language=CSS
      css`
        :host {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        @media (prefers-color-scheme: dark) {
          :host {
            color: #dee2e6;
            background: #131314;
          }
          textarea {
            color: #dee2e6;
            background: #131314;
          }
        }

        @media (prefers-color-scheme: light) {
          :host {
            color: #1d2d35;
            background: #fff;
          }
        }

        @media (min-width: 576px) {
          :host {
            display: flex;
            flex-flow: row wrap;
            flex-direction: row;
          }

          .blocks {
            order: 1;
            width: 49%;
          }

          .authorizer {
            order: 2;
            width: 49%;
          }
        }

        .blocks {
          border: 1px rgba(128, 128, 128, 0.4) solid;
        }
        .authorizer {
          border-top: 1px rgba(128, 128, 128, 0.4) solid;
          border-right: 1px rgba(128, 128, 128, 0.4) solid;
          border-bottom: 1px rgba(128, 128, 128, 0.4) solid;
        }

        p {
          margin-block-start: 0px;
          margin-block-end: 0px;
          padding: 0.2em;
          font-size: 0.8em;
          border-bottom: 1px rgba(128, 128, 128, 0.4) solid;
        }

        bc-datalog-editor {
          border-bottom: 1px rgba(128, 128, 128, 0.4) solid;
        }

        bc-authorizer-editor {
          border-bottom: 1px rgba(128, 128, 128, 0.4) solid;
        }
      `,
    ];
  }
}

window.customElements.define("bc-full-example", BcFullExample);
