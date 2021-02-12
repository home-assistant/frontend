import { EditorState, Prec, tagExtension } from "@codemirror/state";
import { EditorView, keymap, ViewUpdate } from "@codemirror/view";
import { defaultKeymap, defaultTabBinding } from "@codemirror/commands";
import { lineNumbers } from "@codemirror/gutter";
import { HighlightStyle, tags } from "@codemirror/highlight";
import { StreamLanguage } from "@codemirror/stream-parser";
import { jinja2 } from "@codemirror/legacy-modes/mode/jinja2";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";

import {
  customElement,
  internalProperty,
  property,
  PropertyValues,
  UpdatingElement,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
    "editor-save": undefined;
  }
}

const modeTag = Symbol("mode");

const theme = EditorView.theme({
  $: {
    color: "var(--primary-text-color)",
    backgroundColor:
      "var(--code-editor-background-color, var(--card-background-color))",
    "& ::selection": { backgroundColor: "rgba(var(--rgb-primary-color), 0.2)" },
    caretColor: "#var(--secondary-text-color)",
  },

  $$focused: { outline: "none" },

  "$$focused $cursor": { borderLeftColor: "#var(--secondary-text-color)" },
  "$$focused $selectionBackground, $selectionBackground": {
    backgroundColor: "rgba(var(--rgb-primary-color), 0.2)",
  },

  $gutters: {
    backgroundColor:
      "var(--paper-dialog-background-color, var(--primary-background-color))",
    color: "var(--paper-dialog-color, var(--secondary-text-color))",
    border: "none",
    borderRight:
      "1px solid var(--paper-input-container-color, var(--secondary-text-color))",
  },
  "$$focused $gutters": {
    borderRight:
      "2px solid var(--paper-input-container-focus-color, var(--primary-color))",
  },
  "$gutterElementags.lineNumber": { color: "inherit" },
});

const highlightStyle = HighlightStyle.define(
  { tag: tags.keyword, color: "var(--codemirror-keyword, #6262FF)" },
  {
    tag: [
      tags.name,
      tags.deleted,
      tags.character,
      tags.propertyName,
      tags.macroName,
    ],
    color: "var(--codemirror-property, #905)",
  },
  {
    tag: [tags.function(tags.variableName), tags.labelName],
    color: "var(--codemirror-variable, #07a)",
  },
  {
    tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
    color: "var(--codemirror-qualifier, #690)",
  },
  {
    tag: [tags.definition(tags.name), tags.separator],
    color: "var(--codemirror-def, #8DA6CE)",
  },
  {
    tag: [
      tags.typeName,
      tags.className,
      tags.number,
      tags.changed,
      tags.annotation,
      tags.modifier,
      tags.self,
      tags.namespace,
    ],
    color: "var(--codemirror-number, #ca7841)",
  },
  {
    tag: [
      tags.operator,
      tags.operatorKeyword,
      tags.url,
      tags.escape,
      tags.regexp,
      tags.link,
      tags.special(tags.string),
    ],
    color: "var(--codemirror-operator, #cda869)",
  },
  { tag: tags.comment, color: "var(--codemirror-comment, #777)" },
  {
    tag: tags.meta,
    color: "var(--codemirror-meta, var(--primary-text-color))",
  },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  {
    tag: tags.link,
    color: "var(--primary-color)",
    textDecoration: "underline",
  },
  { tag: tags.heading, fontWeight: "bold" },
  { tag: tags.atom, color: "var(--codemirror-atom, #F90)" },
  { tag: tags.bool, color: "var(--codemirror-atom, #F90)" },
  {
    tag: tags.special(tags.variableName),
    color: "var(--codemirror-variable-2, #690)",
  },
  { tag: tags.processingInstruction, color: "var(--secondary-text-color)" },
  { tag: tags.string, color: "var(--codemirror-string, #07a)" },
  { tag: tags.inserted, color: "var(--codemirror-string2, #07a)" },
  { tag: tags.invalid, color: "var(--error-color)" }
);

@customElement("ha-code-editor")
export class HaCodeEditor extends UpdatingElement {
  public codemirror?: EditorView;

  @property() public mode?: string;

  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public readOnly = false;

  @property() public rtl = false;

  @property() public error = false;

  @internalProperty() private _value = "";

  public set value(value: string) {
    this._value = value;
  }

  public get value(): string {
    return this.codemirror ? this.codemirror.state.doc.toString() : this._value;
  }

  public get hasComments(): boolean {
    // TODO: no static classes anymore?
    return !!this.shadowRoot!.querySelector("span.ͼu");
  }

  public connectedCallback() {
    super.connectedCallback();
    if (!this.codemirror) {
      return;
    }
    if (this.autofocus !== false) {
      this.codemirror.focus();
    }
  }

  protected update(changedProps: PropertyValues): void {
    super.update(changedProps);

    if (!this.codemirror) {
      return;
    }

    if (changedProps.has("mode")) {
      this.codemirror.dispatch({
        reconfigure: {
          [modeTag]: this._mode,
        },
      });
    }
    if (changedProps.has("_value") && this._value !== this.value) {
      this.codemirror.dispatch({
        changes: {
          from: 0,
          to: this.codemirror.state.doc.length,
          insert: this._value,
        },
      });
    }
    if (changedProps.has("error")) {
      this.classList.toggle("error-state", this.error);
    }
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._blockKeyboardShortcuts();
    this._load();
  }

  private get _mode() {
    return this.mode === "jinja2"
      ? StreamLanguage.define(jinja2)
      : StreamLanguage.define(yaml);
  }

  private async _load(): Promise<void> {
    const shadowRoot = this.attachShadow({ mode: "open" });

    shadowRoot!.innerHTML = `<style>
      :host(.error-state) div.cm-wrap .cm-gutters {
        border-color: var(--error-state-color, red);
      }
    </style>`;

    const container = document.createElement("div");

    shadowRoot.appendChild(container);

    this.codemirror = new EditorView({
      state: EditorState.create({
        doc: this._value,
        extensions: [
          lineNumbers(),
          keymap.of([...defaultKeymap, defaultTabBinding]),
          tagExtension(modeTag, this._mode),
          theme,
          Prec.fallback(highlightStyle),
          EditorView.updateListener.of((update) => this._onUpdate(update)),
        ],
      }),
      root: shadowRoot,
      parent: container,
    });
  }

  private _blockKeyboardShortcuts() {
    this.addEventListener("keydown", (ev) => ev.stopPropagation());
  }

  private _onUpdate(update: ViewUpdate): void {
    if (!update.docChanged) {
      return;
    }
    const newValue = this.value;
    if (newValue === this._value) {
      return;
    }
    this._value = newValue;
    fireEvent(this, "value-changed", { value: this._value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor": HaCodeEditor;
  }
}
