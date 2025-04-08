/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement } from "lit";

/**
 * TODO DOCS
 */
export class BcAuthorizerContent extends LitElement {
  static get properties() {
    return {
      content: { type: Array },
    };
  }

  constructor() {
    super();
    this.content = [];
  }

  render() {
    const deduped = [...new Set(this.content)];
    const sortedFacts = [...deduped].sort((f1, f2) => {
      if (f1.name == f2.name) {
        return f1.terms > f2.terms ? 1 : -1;
      } else {
        return f1.name > f2.name ? 1 : -1;
      }
    });

    var facts_map = {};
    var facts = "";
    var current_name;
    for (let fact of sortedFacts) {
      if (facts_map[fact.name] == undefined) {
        facts_map[fact.name] = [];
      }

      let alreadyThere = false;
      for (let terms of facts_map[fact.name]) {
        console.log(terms.join(), fact.terms.join());
        if (terms.join() === fact.terms.join()) {
          alreadyThere = true;
          break;
        }
      }

      if (alreadyThere) continue;

      facts_map[fact.name].push(fact.terms);

      if (current_name == undefined) {
        current_name = fact.name;
      }

      if (fact.name != current_name) {
        facts += "\n";
        current_name = fact.name;
      }

      facts += fact.name + "(" + fact.terms + ");\n";
    }

    return html` <div>
      <bc-datalog-editor code=${facts} readonly="true"></bc-datalog-editor>
    </div>`;
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

window.customElements.define("bc-authorizer-content", BcAuthorizerContent);
