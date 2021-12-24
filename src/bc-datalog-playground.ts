import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./bc-datalog-editor.js";
import { initialize } from "./wasm.js";
import { execute } from "@biscuit-auth/biscuit-wasm-support";
import { convertMarker } from "./markers";

/**
 * TODO DOCS
 */
@customElement("bc-datalog-playground")
export class BCDatalogPlayground extends LitElement {
  @property() code = "";
  @state() private started = false;

  constructor() {
    super();
    const codeChild = this.querySelector("code");
    if (codeChild !== null) {
      this.code = codeChild.textContent?.trim() ?? "";
    }
  }

  firstUpdated() {
    initialize().then(() => (this.started = true));
  }

  onUpdatedCode(e: { detail: { code: string } }) {
    this.code = e.detail.code;
  }

  render() {
    let markers = [];
    let authorizer_world = [];
    if (this.started) {
      const authorizerQuery = {
        token_blocks: [],
        authorizer_code: this.code,
        query: "",
      };
      const authorizerResult = execute(authorizerQuery);
      authorizer_world = authorizerResult.authorizer_world;
      markers = authorizerResult.authorizer_editor.markers.map(convertMarker);
    }

    return html`
      <bc-authorizer-editor
        code=${this.code}
        markers=${JSON.stringify(markers)}
        @bc-authorizer-editor:update=${this.onUpdatedCode}
        }
      >
      </bc-authorizer-editor>
      Facts:
      <bc-authorizer-content
        content="${JSON.stringify(authorizer_world)}"
      ></bc-authorizer-content>
    `;
  }
}
