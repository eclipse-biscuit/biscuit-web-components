/*
 * SPDX-FileCopyrightText: 2021 Geoffroy Couprie <contact@geoffroycouprie.com>, Clément Delafargue <clement@delafargue.name>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { Parser } from "../tree-sitter.js";
import { dispatchCustomEvent } from "./lib/events.js";

const QUERY = `
;; Literals
(number) @constant.numeric.integer
(boolean) @constant.builtin.boolean
(string) @string
(bytes) @string
(date) @constant.numeric.integer

;; Comments
(block_comment) @comment.block
(line_comment) @comment.line

;; Variables
(variable) @variable
(param) @variable.parameter

(predicate
  (nname) @function
)

(fact
  (nname) @function
)

;; Keywords
[
  "trusting"
  "check if"
  "check all"
  "reject if"
  "allow if"
  "deny if"
] @keyword

[
  "authority"
  "previous"
] @constant.builtin

[
  "<-"
] @keyword.operator

;; Punctuation
[ "," ] @punctuation.delimiter

[ "("
  ")"
  "["
  "]"
] @punctuation.bracket

[
  "/"
  "*"
  "+"
  "-"
  "&"
  "|"
  "^"
  ">" "<" "<=" ">=" "==" "!="
  "&&"
  "||"
] @operator`;

export interface Range {
  name: string;
  node: {
    startIndex: number;
    endIndex: number;
  };
}

@customElement("bc-datalog-editor")
export class BcDatalogEditor extends LitElement {
  @property()
  code = "";
  @property()
  marks: Range[] = [];
  @property()
  readonly = false;
  @state()
  _tree: Parser.Tree | null = null;
  @state()
  _captures: Parser.QueryCapture[] = [];

  @state()
  _parser: Parser | null = null;

  @state()
  _query: Parser.Query | null = null;

  constructor() {
    super();

    const codeChild = this.querySelector("code");
    if (codeChild !== null) {
      this.code = trimLines(codeChild.textContent ?? "");
    }
  }

  connectedCallback() {
    super.connectedCallback();
    console.log("connected callback");
    console.log("Parser initialized");
    console.log(Parser.Language);
    Parser.Language.load("/assets/tree-sitter-biscuit.wasm").then(
      (BiscuitDatalog) => {
        console.log("Language initialized");
        const p = new Parser();
        p.setLanguage(BiscuitDatalog);
        this._query = BiscuitDatalog.query(QUERY);
        this._parser = p;
        this.handleInput(this.code);
      }
    );
  }

  firstUpdated(values: PropertyValues) {
    super.firstUpdated(values);
    // trigger syntax highlighting for code provided as props
    if (this.shadowRoot) {
      this.handleInput(
        (this.shadowRoot.querySelector("#editing") as HTMLInputElement).value
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === "code" && oldValue != newValue) {
      this.handleInput(newValue);
    }
  }

  handleInput(value: string | null) {
    if (this._parser && this._query) {
      const code = value ?? "";
      const tree = this._parser.parse(code);
      const captures = this._query.captures(tree.rootNode);
      this._tree = tree;
      this._captures = captures;
      this.code = code;
    }
    this.syncScroll();
  }

  syncScroll() {
    if (this.shadowRoot) {
      const textarea = this.shadowRoot.querySelector("#editing");
      const highlighting = this.shadowRoot.querySelector("#highlighting");
      if (textarea && highlighting) {
        highlighting.scrollTop = textarea.scrollTop;
        highlighting.scrollLeft = textarea.scrollLeft;
      }
    }
  }

  render() {
    const rendered = this.renderText2(this.code, this._captures, this.marks);
    const rows = Math.max(this.code.split("\n").length, 1);
    return html`<div id="wrapper">
      <textarea
        id="editing"
        rows=${rows}
        readonly=${ifDefined(this.readonly ? "true" : undefined)}
        @input=${(e: InputEvent) => {
          const code = (e.target as HTMLInputElement)?.value;
          this.handleInput(code);
          dispatchCustomEvent(this, "update", { code });
        }}
        @keydown=${(e: Event) => e.stopPropagation()}
        spellcheck="false"
        @scroll=${this.syncScroll}
      >
${this.code}</textarea
      >
      <pre
        id="highlighting"
        aria-hidden="true"
      ><code id="highlighting-content">${unsafeHTML(rendered)}</code></pre>
    </div>`;
  }

  renderText2(text: string, captures: Range[], marks: Range[]) {
    // captures come from tree-sitter and are assumed to be properly nested
    // (if nested at all, they are mostly contiguous).
    // marks however are user provided and completely separate from TS. so even
    // if the user is not doing bad things, they still don't have access to the
    // TS tree and can't be asked to provide marks that don't nest correctly
    // with TS captures.

    // captures and marks are grouped by starting index. We know that an
    // opening tag will always be there at this position.
    const ranges = new Map();
    marks.concat(captures).forEach((c) => {
      if (c.node.startIndex >= c.node.endIndex) return;
      ranges.set(
        c.node.startIndex,
        (ranges.get(c.node.startIndex) ?? []).concat(c)
      );
    });

    let output = "";
    // active ranges, indexed by their end index
    const activeRanges = new Map();
    [...text].forEach((c, i) => {
      // every range is encoded as a span element, so there is no need
      // to care about the order, we only need to close the correct amount
      // of spans
      (activeRanges.get(i) ?? []).forEach(() => {
        output += "</span>";
      });
      activeRanges.delete(i);
      const openingNow = ranges.get(i) ?? [];

      // position of the next range end. ranges created now can't go further
      const lastValidIndex = [...activeRanges.keys()].sort()[0] ?? text.length;

      // list of the ranges created by splitting opening ranges at the next
      // enclosing range end
      const createdRanges: Range[] = [];

      // for each of the new ranges, make sure they are properly included in
      // the active ranges (ie they end before the next closing tag).
      // If they are not, we will need to close them at the closest boundary,
      // and open them again. if the newly created range still intersects with
      // an already defined one, it will be handled at its starting index, so
      // we don't need to do further work here.
      const openingAdapted = openingNow.map((r: Range) => {
        // since we're operating on shallow copies, mutating `r` directly
        // would mutate it everywhere else (including across) renders
        let adapted = r;
        if (r.node.endIndex > lastValidIndex) {
          // clamp the opening range at the end of the enclosing one,
          // and put the leftover in a new one
          adapted = {
            ...r,
            node: {
              startIndex: adapted.node.startIndex,
              endIndex: lastValidIndex,
            },
          };
          createdRanges.push({
            name: r.name,
            node: {
              startIndex: lastValidIndex,
              endIndex: r.node.endIndex,
            },
          });
        }

        // opening ranges are now part of the active set
        activeRanges.set(
          adapted.node.endIndex,
          (activeRanges.get(adapted.node.endIndex) ?? []).concat(adapted)
        );
        return adapted;
      });

      // insert the newly created ranges in the range map so future iterations
      // can pick them up
      ranges.set(
        lastValidIndex,
        (ranges.get(lastValidIndex) ?? []).concat(createdRanges)
      );

      // now that we have the final list of ranges starting at the current
      // position, we can sort them so that the widest ranges are opened first,
      // to let them contain smaller ranges
      openingAdapted
        .sort((a: Range, b: Range) => {
          return b.node.endIndex - a.node.endIndex;
        })
        .forEach((r: Range) => {
          output += `<span class="${r.name.split(".").join(" ")}">`;
        });

      if (c === `\n`) {
        output += "<br>";
      } else if (c === `<`) {
        output += "&lt;";
      } else if (c === `>`) {
        output += "&gt;";
      } else if (c === ` `) {
        output += " "; // pre collapes / ignores leading spaces. an non-breaking
        // space will always take the correct amount of space
      } else {
        output += c;
      }
    });

    // handle ranges closing after the last char
    (activeRanges.get(text.length) ?? []).forEach(() => {
      output += "</span>";
    });

    // pre hides empty final lines (or containing just a space or a tab):
    // this nbsp forces pre to display an empty line. this makes sure a new
    // line is displayed when typing enter at the end of the last line.
    // The final <br> tag might be inside one or several spans tags, so we
    // need to keep looking right until we find the last `</span>` tag, and
    // then inspect what's just before
    let offset = 0;
    while (output.slice(offset - 7, 7) == "</span>") {
      offset -= 7;
    }
    if (output.slice(offset - 4, 4) === "<br>") {
      output += " ";
    }
    return output;
  }

  static styles = css`
    #wrapper {
      position: relative;
    }

    #editing,
    #highlighting {
      margin: 0;
      padding: 10px;
      border: 0;
      width: calc(100% - 22px);
      overflow: auto;
      white-space: nowrap;
    }

    #editing,
    #highlighting,
    #highlighting * {
      font-size: var(--editor-font, 13px);
      font-family: monospace;
      line-height: calc(var(--editor-font, 13px) * 1.3);
    }

    #highlighting {
      border: 1px solid black;
    }

    #editing {
      position: relative;
      resize: vertical;
      z-index: 1;
      min-height: 5em;

      white-space: pre;
      color: transparent;
      background: transparent;
      caret-color: var(--foreground); /* Or choose your favorite color */
    }

    #highlighting {
      position: absolute;
      top: 0;
      bottom: 3px;
      left: 0;
      z-index: 0;
      color: var(--foreground);
      background-color: var(--background);
    }

    :host {
      --background: #fafafa;
      --foreground: #5c6166;
      --black: #e7eaed;
      --white: #fcfcfc;
      --blue: #399ee6;
      --light_blue: #55b4d4;
      --cyan: #478acc;
      --dark_gray: #d8d8d7;
      --gray: #828c9a;
      --green: #86b300;
      --green-bg: rgba(134, 170, 0, 0.3);
      --magenta: #a37acc;
      --orange: #fa8d3e;
      --red: #f07171;
      --red-bg: rgba(240, 113, 113, 0.3);
      --yellow: #ffaa33;
    }

    .constant {
      color: var(--magenta);
    }

    .string {
      color: var(--green);
    }

    .comment {
      color: var(--gray);
      font-style: italic;
    }

    .variable {
      color: var(--foreground);
    }

    .punctuation {
      color: var(--foreground);
    }

    .keyword {
      color: var(--orange);
    }

    .operator {
      color: var(--orange);
    }

    .function {
      color: var(--yellow);
    }

    .warning {
      color: var(--yellow);
    }

    .mark.failure {
      background-color: var(--red-bg);
    }

    .mark.error {
      text-decoration: underline wavy var(--red);
    }

    .mark.success {
      background-color: var(--green-bg);
    }

    .hint {
      color: var(--blue);
      font-weight: bold;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --background: #0f1419;
        --foreground: #bfbdb6;
        --black: #131721;
        --blue: #59c2ff;
        --dark_gray: #2d3640;
        --cyan: #73b8ff;
        --gray: #5c6773;
        --green: #aad94c;
        --green-bg: rgba(170, 217, 76, 0.5);
        --magenta: #d2a6ff;
        --orange: #ff8f40;
        --red: #f07178;
        --red-bg: rgba(240, 113, 120, 0.5);
        --yellow: #e6b450;
      }
      .comment {
        color: var(--gray);
        text-transform: italic;
      }
      .error {
        color: var(--red);
        font-weight: bold;
      }
      .hint {
        color: var(--blue);
        font-weight: bold;
      }
      .constant {
        color: var(--magenta);
      }
      .function {
        color: var(--yellow);
      }
      .keyword {
        color: var(--orange);
      }
      .operator {
        color: var(--orange);
      }
      .punctuation {
        color: var(--foreground);
      }
      .string {
        color: var(--green);
      }
      .variable {
        color: var(--foreground);
      }
      .warning {
        color: var(--yellow);
      }
    }
  `;
}

function trimLines(str: string) {
  return str
    .trim()
    .split("\n")
    .map((line: string) => line.trim())
    .join("\n");
}
