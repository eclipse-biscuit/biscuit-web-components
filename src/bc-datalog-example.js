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
export class BcDatalogExample extends LitElement {
  static get properties() {
    return {
      code: { type: String },
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

    console.log("constructor: got code:");
    console.log(this.code);

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
    code += "\n\nallow if true;";

    if (this.started) {
      var state = {
        token_blocks: [],
        authorizer_code: code,
        query: "",
      };
      var result = execute(state);

      authorizer_result = result.authorizer_result;
      authorizer_world = result.authorizer_world;

      if (result.authorizer_editor != null) {
        for (let error of result.authorizer_editor.errors) {
          parseErrors.push({
            message: error.message,
            severity: "error",
            start: error.position.start,
            end: error.position.end,
          });
        }

        for (let marker of result.authorizer_editor.markers) {
          // do not display the marker for the additional "allow if true"
          if (marker.position.start != this.code.length + 2) {
            markers.push({
              start: marker.position.start,
              end: marker.position.end,
              ok: marker.ok,
            });
          }
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
      Facts:
      <bc-authorizer-content
        content="${JSON.stringify(authorizer_world)}"
      ></bc-authorizer-content>
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

window.customElements.define("bc-datalog-example", BcDatalogExample);
