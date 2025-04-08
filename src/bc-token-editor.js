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
export class BcTokenEditor extends LitElement {
  static get properties() {
    return {
      biscuit: { type: String },
      _blocks: { type: Array },
      parseErrors: { type: Array },
      markers: { type: Array },
    };
  }

  constructor() {
    super();
    this._blocks = [];
    for (const child of Array.from(this.children)) {
      this._blocks.push({ code: child.innerHTML });
    }

    this.parseErrors = [];
    this.markers = [];
  }

  _onAddBlock() {
    this._blocks = [...this._blocks, { code: "" }];
  }

  _onRemoveBlock(block) {
    this._blocks = this._blocks.filter((b) => b !== block);
  }

  _onUpdatedCode(block, code) {
    block.code = code;
    dispatchCustomEvent(this, "update", { blocks: this._blocks });
  }

  update(changedProperties) {
    super.update(changedProperties);
  }

  render() {
    return html`
      <div>
        <button @click=${this._onAddBlock}>add block</button>
      </div>
      ${this._blocks.map(
        (block, index) => html`
          <button @click=${() => this._onRemoveBlock(block)}>
            remove this block
          </button>
          <bc-datalog-editor
            code=${block.code}
            .marks=${this.markers[index].concat(this.parseErrors[index])}
            @bc-datalog-editor:update="${(e) => {
              this._onUpdatedCode(block, e.detail.code);
            }}"
            }
          >
          </bc-datalog-editor>
        `
      )}
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

window.customElements.define("bc-token-editor", BcTokenEditor);
