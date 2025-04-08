/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { dispatchCustomEvent } from "../src/lib/events.js";
import { execute } from "@biscuit-auth/biscuit-wasm-support";
import "./bc-authorizer-editor.js";
import "./bc-authorizer-result";
import "./bc-authorizer-content.js";
import { initialize } from "./wasm.js";

/**
 * TODO DOCS
 */
export class BcAuthorizerExample extends LitElement {
  static get properties() {
    return {
      code: { type: String },
      defaultAllow: { type: Boolean },
      started: { type: Boolean },
    };
  }

  constructor() {
    super();
    if (this.children[0] != undefined) {
      this.code = this.children[0].innerHTML;
    } else {
      this.code = "";
    }

    this.defaultAllow = false;
    this.started = false;
  }

  _onUpdatedCode(code) {
    this.code = code;
    dispatchCustomEvent(this, "update", { code: code });
  }

  firstUpdated(changedProperties) {
    initialize().then(() => (this.started = true));
  }

  update(changedProperties) {
    super.update(changedProperties);
  }

  render() {
    var parseErrors = [];
    var markers = [];
    var authorizer_result = "";
    var authorizer_world = [];

    var code = this.code;
    if (this.defaultAllow) {
      code += "\n\nallow if true;";
    }

    if (this.started) {
      var state = {
        token_blocks: [""],
        authorizer_code: code,
        external_private_keys: [],
        query: "",
      };
      var result = execute(state);

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

      if (result.authorizer_editor != null) {
        for (let error of result.authorizer_editor.errors) {
          parseErrors.push({
            message: error.message,
            severity: "error",
            from: error.position.start,
            to: error.position.end,
          });
        }

        for (let marker of result.authorizer_editor.markers) {
          console.log(marker);
          markers.push({
            start: marker.position.start,
            end: marker.position.end,
            ok: marker.ok,
          });
        }
      }
    }

    return html`
      <bc-authorizer-editor
        code="${this.code}"
        parseErrors="${JSON.stringify(parseErrors)}"
        markers="${JSON.stringify(markers)}"
        @bc-authorizer-editor:update="${(e) => {
          this._onUpdatedCode(e.detail.code);
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
    `;
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

window.customElements.define("bc-authorizer-example", BcAuthorizerExample);
