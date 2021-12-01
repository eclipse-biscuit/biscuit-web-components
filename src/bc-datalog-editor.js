import { css, html, LitElement } from 'lit-element';
import { dispatchCustomEvent } from '../src/lib/events.js';

import {keymap, EditorView, Range, Decoration} from "@codemirror/view"
import {EditorState,StateField,StateEffect} from "@codemirror/state"
import {basicSetup} from "@codemirror/basic-setup"
import {history, historyKeymap} from "@codemirror/history"
import {defaultKeymap} from "@codemirror/commands"
import {StreamLanguage} from "@codemirror/stream-parser"
import {simpleMode} from "@codemirror/legacy-modes/mode/simple-mode"
import {lineNumbers, GutterMarker, gutter} from "@codemirror/gutter"
import {classHighlightStyle} from "@codemirror/highlight";
import {RangeSet} from "@codemirror/rangeset";

let biscuit_mode = simpleMode({
  // The start state contains the rules that are initially used
  start: [
    {
      regex: /(allow if|deny if|check if|or|and|<-)\b/,
      token: 'keyword',
    },
    { regex: /\/\/.*/, token: 'comment' },
    { regex: /\/\*/, token: 'comment', next: 'comment' },

    // predicate name
    { regex: /([A-Za-z_][\w]*)/, token: 'keyword', next: 'terms' },

    { regex: /,/, token: 'operator' },
    { regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: 'string' },
    { regex: /\$[A-Za-z_][\w]*/, token: 'variable' },
    { regex: /#[A-Za-z_][\w]*/, token: 'symbol' },
    { regex: /true|false/, token: 'atom' },
    // RFC 3339 date
    {
      regex: /(\d+)-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d|60)(\.\d+)?(([Zz])|([\+|\-]([01]\d|2[0-3]):([0-5]\d)))/,
      token: 'atom',
    },
    { regex: /[-+]?\d+/i, token: 'number' },

    // A next property will cause the mode to move to a different state
    { regex: /[-+*\/=<>!]+/, token: 'operator' },
    { regex: /&&|\|\|/, token: 'operator' },
    // indent and dedent properties guide autoindentation
    { regex: /[\{\[\(]/, indent: true },
    { regex: /[\}\]\)]/, dedent: true },
  ],
  // The multi-line comment state.
  comment: [
    { regex: /.*?\*\//, token: 'comment', next: 'start' },
    { regex: /.*/, token: 'comment' },
  ],
  terms: [
    { regex: /,/, token: 'operator' },
    // The regex matches the token, the token property contains the type
    { regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: 'string' },
    { regex: /\$[A-Za-z_][\w]*/, token: 'variable' },
    { regex: /#[A-Za-z_][\w]*/, token: 'symbol' },
    { regex: /true|false/, token: 'atom' },
    // RFC 3339 date
    {
      regex: /(\d+)-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d|60)(\.\d+)?(([Zz])|([\+|\-]([01]\d|2[0-3]):([0-5]\d)))/,
      token: 'atom',
    },
    { regex: /[-+]?\d+/i, token: 'number' },
    { regex: /\)/, next: 'start' },
  ],
  // The meta property contains global information about the mode. It
  // can contain properties like lineComment, which are supported by
  // all modes, and also directives like dontIndentStates, which are
  // specific to simple modes.
  meta: {
    dontIndentStates: ['comment'],
    lineComment: '//',
  },

});

function resetParseError(view) {
  view.dispatch({
    effects: resetParseErrorEffect.of({})
  })
}

function setParseError(view, pos) {
  let parseErrors = view.state.field(parseErrorState)
  view.dispatch({
    effects: parseErrorEffect.of({pos})
  })
}

const resetParseErrorEffect = StateEffect.define({
  map: (val, mapping) => ({})
})
const parseErrorEffect = StateEffect.define({
  map: (val, mapping) => ({pos: mapping.mapPos(val.pos), on: true})
})

const parseErrorState = StateField.define({
  create() { return RangeSet.empty },
  update(set, transaction) {
    set = set.map(transaction.changes)
    for (let e of transaction.effects) {
      if (e.is(parseErrorEffect)) {
        set = set.update({add: [parseErrorMarker.range(e.value.pos)]})
      }
      if (e.is(resetParseErrorEffect)) {
        set = RangeSet.empty
      }
    }
    return set
  }
})

const parseErrorMarker = new class extends GutterMarker {
  toDOM() {
    return document.createTextNode("❌")
  }
}

// Effects can be attached to transactions to communicate with the extension
const addSuccessMarks = StateEffect.define(), addFailureMarks = StateEffect.define(),
  resetMarks = StateEffect.define()

// This value must be added to the set of extensions to enable this
const markField = StateField.define({
  // Start with an empty set of decorations
  create() { return Decoration.none },
  // This is called whenever the editor updates—it computes the new set
  update(value, tr) {
    // Move the decorations to account for document changes
    value = value.map(tr.changes)
    // If this transaction adds or removes decorations, apply those changes
    for (let effect of tr.effects) {
      if (effect.is(addSuccessMarks)) value = value.update({add: effect.value, sort: true})
      else if (effect.is(addFailureMarks)) value = value.update({add: effect.value, sort: true})
      else if (effect.is(resetMarks)) value = value.update({filter: (from, to) => false})
    }
    return value
  },
  // Indicate that this field provides a set of decorations
  provide: f => EditorView.decorations.from(f)
})

const successMark = Decoration.mark({
  attributes: {style: "background: rgb(193, 241, 193)"}
})

const failureMark = Decoration.mark({
  attributes: {style: "background: rgb(255, 162, 162)"}
})

function resetAllMarks(view) {
  view.dispatch({
    effects: resetMarks.of({})
  })
}

function setSuccessMark(view, start, end) {
  let parseErrors = view.state.field(parseErrorState)
  view.dispatch({
    effects: addSuccessMarks.of([successMark.range(start, end)])
  })
}

function setFailureMark(view, start, end) {
  let parseErrors = view.state.field(parseErrorState)
  view.dispatch({
    effects: addFailureMarks.of([failureMark.range(start, end)])
  })
}


/**
 * TODO DOCS
 */
export class BcDatalogEditor extends LitElement {

  static get properties () {
    return {
      datalog: { type: String },
      parseErrors: { type: Array },
      markers: { type: Array },
    };
  }

  constructor () {
    super();
    this.parseErrors = [];
    this.markers = [];
  }

  _onText (code) {
    this.datalog = code;
    dispatchCustomEvent(this, 'update', {code: code});
  }

  firstUpdated () {
    const textarea = this.shadowRoot.querySelector('textarea');
    //this.parseErrors = [];
    //this.markers = [];

    let updateListenerExtension = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        this._onText(htmlEntities(this._cm.state.doc.toString()));
      }
    });

    const parseErrorGutter = [
      parseErrorState,
      gutter({
        class: "cm-parse-error-gutter",
        markers: v => v.state.field(parseErrorState),
        initialSpacer: () => parseErrorMarker,
      }),
      EditorView.baseTheme({
        ".cm-parse-error-gutter .cm-gutterElement": {
          color: "red",
          paddingLeft: "5px",
          cursor: "default"
        }
      })
    ]

    this._cm = new EditorView({
      root: this.renderRoot,
      state: EditorState.create({
        doc: textarea.value,
        extensions: [
          basicSetup,
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          updateListenerExtension,
          StreamLanguage.define(biscuit_mode),
          parseErrorGutter,
          markField,
        ]
      }),
    });

    textarea.parentNode.insertBefore(this._cm.dom, textarea)
    textarea.style.display = "none"
    if (textarea.form) textarea.form.addEventListener("submit", () => {
      textarea.value = view.state.doc.toString()
    })
  }

  updated (changedProperties) {
    console.log("updated");
    console.log(changedProperties);
    super.updated(changedProperties);
    if (changedProperties.has('datalog')) {
      if(this.datalog != this._cm.state.doc.toString()) {
        this._cm.dispatch({
          changes: {from: 0, to: this._cm.state.doc.length, insert: this.datalog}
        })
      }
    }

    if(changedProperties.has('parseErrors')) {
      console.log("got parseErrors");
      resetParseError(this._cm);

      console.log(this.parseErrors);
      let errs = changedProperties.get('parseErrors');
      if(changedProperties.has('parseErrors')) {
        for (let error of this.parseErrors) {
          setParseError(this._cm, error.from);
        }
      }
    }

    if(changedProperties.has('markers')) {
      resetAllMarks(this._cm);


      if(changedProperties.has('markers')) {
        for(let mark of this.markers) {
          if(mark.ok) {
            setSuccessMark(this._cm, mark.start, mark.end);
          } else {
            setFailureMark(this._cm, mark.start, mark.end);
          }
        }
      }
    }
  }

  render () {
    return html`
    <div>
      <textarea></textarea>
    </div>
    `;
  }

  static get styles () {
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

function htmlEntities(str) {
  return String(str).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

window.customElements.define('bc-datalog-editor', BcDatalogEditor);
