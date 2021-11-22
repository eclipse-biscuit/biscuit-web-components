import { css, html, LitElement } from 'lit-element';
import { dispatchCustomEvent } from '../src/lib/events.js';
import { codemirrorStyles } from './codemirror.css.js';

//import { codemirrorLinkStyles } from './lint.css.js';
//import 'codemirror/addon/mode/simple.js';
//import 'codemirror/addon/lint/lint.js';
import {keymap, EditorView} from "@codemirror/view"
//import {darkTheme} from "@codemirror/view/theme"
import {EditorState} from "@codemirror/state"
import {basicSetup} from "@codemirror/basic-setup"
import {history, historyKeymap} from "@codemirror/history"
import {defaultKeymap} from "@codemirror/commands"
import {StreamLanguage} from "@codemirror/stream-parser"
import {simpleMode} from "@codemirror/legacy-modes/mode/simple-mode"
import {lineNumbers} from "@codemirror/gutter"
import { oneDarkTheme } from "@codemirror/theme-one-dark";
import {classHighlightStyle} from "@codemirror/highlight";
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


//defineSimpleMode();

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
    dispatchCustomEvent(this, 'update', {code: code});
  }

  firstUpdated () {
    const textarea = this.shadowRoot.querySelector('textarea');
    this._displayedMarks = [];

    let updateListenerExtension = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        console.log("updated");
        console.log(update);
        console.log("content");
        console.log(htmlEntities(this._cm.state.doc.toString()));
        this._onText(htmlEntities(this._cm.state.doc.toString()));
      }
    });

    this._cm = new EditorView({
      state: EditorState.create({
        doc: textarea.value,
        extensions: [
          basicSetup,
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          updateListenerExtension,
          StreamLanguage.define(biscuit_mode),
          classHighlightStyle,
        ]
      }),
    });
    textarea.parentNode.insertBefore(this._cm.dom, textarea)
    textarea.style.display = "none"
    if (textarea.form) textarea.form.addEventListener("submit", () => {
      textarea.value = view.state.doc.toString()
    })
    /*
    new CodeMirror.fromTextArea(textarea, {
      mode: 'biscuit',
      autoCloseTags: true,
      lineNumbers: true,
      gutters: ['CodeMirror-lint-markers'],
      lintOnChange: false,
      lint: {
         getAnnotations: () => {
           this.parseErrors
         },
      },
    });
    */

    //this._cm.on('change', () => this._onText(this._cm.getValue()));
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

    /*
    if(changedProperties.has('parseErrors')) {
      var state = this._cm.state.lint;
      if(state.hasGutter) this._cm.clearGutter("CodeMirror-lint-markers"); 
      for (var i = 0; i < state.marked.length; ++i) {
        state.marked[i].clear();
      }
      state.marked.length = 0;

      this._cm.setOption("lint", false);
      this._cm.setOption("lint", {
         getAnnotations: () => {
           return this.parseErrors;
         },
      });
    }

    if(changedProperties.has('markers')) {
      for(let mark of this._displayedMarks) {
        mark.clear();
      }
      this._displayedMarks = [];

      for(let marker of this.markers) {
        var mark = this._cm.markText(marker.from, marker.to, marker.options);
        this._displayedMarks.push(mark);
      }

    }*/
  }

  render () {
    return html`
    <div>
      <textarea></textarea>
      <p class="csstest">Hello</p>
    </div>
    `;
  }

  //static styles =  codemirrorStyles;
  static get styles () {
    return [
      codemirrorStyles,
      //codemirrorLinkStyles,
      // language=CSS
      css`
        :host {
          display: block;
        }

        .csstest { background: red }
      `,
    ];
  }
}

function htmlEntities(str) {
  return String(str).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

window.customElements.define('bc-datalog-editor', BcDatalogEditor);
