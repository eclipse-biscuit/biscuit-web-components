/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement } from "lit";
import "./bc-datalog-editor";
import { dispatchCustomEvent } from "../src/lib/events.js";

/**
 * TODO DOCS
 */
export class BcAuthorizerEditor extends LitElement {
  static get properties() {
    return {
      code: { type: String },
      parseErrors: { type: Array },
      markers: { type: Array },
    };
  }

  constructor() {
    super();
    if (this.children[0] != undefined) {
      this.code = this.children[0].innerHTML;
    } else {
      this.code = "";
    }
    this.parseErrors = [];
    this.markers = [];
  }

  _onUpdatedCode(code) {
    this.code = code;
    dispatchCustomEvent(this, "update", { code: code });
  }

  update(changedProperties) {
    super.update(changedProperties);
  }

  render() {
    return html`
      <bc-datalog-editor
        code=${this.code}
        .marks=${this.markers.concat(this.parseErrors)}
        @bc-datalog-editor:update="${(e) => {
          this._onUpdatedCode(e.detail.code);
        }}"
        }
      >
      </bc-datalog-editor>
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

window.customElements.define("bc-authorizer-editor", BcAuthorizerEditor);
