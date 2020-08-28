import { Editor } from "codemirror";
import {
  customElement,
  internalProperty,
  property,
  PropertyValues,
  UpdatingElement,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { loadCodeMirror } from "../resources/codemirror.ondemand";

declare global {
  interface HASSDomEvents {
    "editor-save": undefined;
  }
}

@customElement("ha-code-editor")
export class HaCodeEditor extends UpdatingElement {
  public codemirror?: Editor;

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
    return this.codemirror ? this.codemirror.getValue() : this._value;
  }

  public get hasComments(): boolean {
    return !!this.shadowRoot!.querySelector("span.cm-comment");
  }

  public connectedCallback() {
    super.connectedCallback();
    if (!this.codemirror) {
      return;
    }
    this.codemirror.refresh();
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
      this.codemirror.setOption("mode", this.mode);
    }
    if (changedProps.has("autofocus")) {
      this.codemirror.setOption("autofocus", this.autofocus !== false);
    }
    if (changedProps.has("_value") && this._value !== this.value) {
      this.codemirror.setValue(this._value);
    }
    if (changedProps.has("rtl")) {
      this.codemirror.setOption("gutters", this._calcGutters());
      this._setScrollBarDirection();
    }
    if (changedProps.has("error")) {
      this.classList.toggle("error-state", this.error);
    }
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._load();
  }

  private async _load(): Promise<void> {
    const loaded = await loadCodeMirror();

    const codeMirror = loaded.codeMirror;

    const shadowRoot = this.attachShadow({ mode: "open" });

    shadowRoot!.innerHTML = `
    <style>
      ${loaded.codeMirrorCss}
      .CodeMirror {
        height: var(--code-mirror-height, auto);
        direction: var(--code-mirror-direction, ltr);
      }
      .CodeMirror-scroll {
        max-height: var(--code-mirror-max-height, --code-mirror-height);
      }
      :host(.error-state) .CodeMirror-gutters {
        border-color: var(--error-state-color, red);
      }
      .CodeMirror-focused .CodeMirror-gutters {
        border-right: 2px solid var(--paper-input-container-focus-color, var(--primary-color));
      }
      .CodeMirror-linenumber {
        color: var(--paper-dialog-color, var(--secondary-text-color));
      }
      .rtl .CodeMirror-vscrollbar {
        right: auto;
        left: 0px;
      }
      .rtl-gutter {
        width: 20px;
      }
      .CodeMirror-gutters {
        border-right: 1px solid var(--paper-input-container-color, var(--secondary-text-color));
        background-color: var(--paper-dialog-background-color, var(--primary-background-color));
        transition: 0.2s ease border-right;
      }
      .cm-s-default.CodeMirror {
        background-color: var(--code-editor-background-color, var(--card-background-color));
        color: var(--primary-text-color);
      }
      .cm-s-default .CodeMirror-cursor {
        border-left: 1px solid var(--secondary-text-color);
      }
      
      .cm-s-default div.CodeMirror-selected, .cm-s-default.CodeMirror-focused div.CodeMirror-selected {
        background: rgba(var(--rgb-primary-color), 0.2);
      }
      
      .cm-s-default .CodeMirror-line::selection,
      .cm-s-default .CodeMirror-line>span::selection,
      .cm-s-default .CodeMirror-line>span>span::selection {
        background: rgba(var(--rgb-primary-color), 0.2);
      }
      
      .cm-s-default .cm-keyword {
        color: var(--codemirror-keyword, #6262FF);
      }
      
      .cm-s-default .cm-operator {
        color: var(--codemirror-operator, #cda869);
      }
      
      .cm-s-default .cm-variable-2 {
        color: var(--codemirror-variable-2, #690);
      }
      
      .cm-s-default .cm-builtin {
        color: var(--codemirror-builtin, #9B7536);
      }
      
      .cm-s-default .cm-atom {
        color: var(--codemirror-atom, #F90);
      }
      
      .cm-s-default .cm-number {
        color: var(--codemirror-number, #ca7841);
      }
      
      .cm-s-default .cm-def {
        color: var(--codemirror-def, #8DA6CE);
      }
      
      .cm-s-default .cm-string {
        color: var(--codemirror-string, #07a);
      }
      
      .cm-s-default .cm-string-2 {
        color: var(--codemirror-string-2, #bd6b18);
      }
      
      .cm-s-default .cm-comment {
        color: var(--codemirror-comment, #777);
      }
      
      .cm-s-default .cm-variable {
        color: var(--codemirror-variable, #07a);
      }
      
      .cm-s-default .cm-tag {
        color: var(--codemirror-tag, #997643);
      }
      
      .cm-s-default .cm-meta {
        color: var(--codemirror-meta, #000);
      }
      
      .cm-s-default .cm-attribute {
        color: var(--codemirror-attribute, #d6bb6d);
      }
      
      .cm-s-default .cm-property {
        color: var(--codemirror-property, #905);
      }
      
      .cm-s-default .cm-qualifier {
        color: var(--codemirror-qualifier, #690);
      }
      
      .cm-s-default .cm-variable-3  {
        color: var(--codemirror-variable-3, #07a);
      }

      .cm-s-default .cm-type {
        color: var(--codemirror-type, #07a);
      }
    </style>`;

    this.codemirror = codeMirror(shadowRoot, {
      value: this._value,
      lineNumbers: true,
      tabSize: 2,
      mode: this.mode,
      autofocus: this.autofocus !== false,
      viewportMargin: Infinity,
      readOnly: this.readOnly,
      extraKeys: {
        Tab: "indentMore",
        "Shift-Tab": "indentLess",
      },
      gutters: this._calcGutters(),
    });
    this._setScrollBarDirection();
    this.codemirror!.on("changes", () => this._onChange());
  }

  private _onChange(): void {
    const newValue = this.value;
    if (newValue === this._value) {
      return;
    }
    this._value = newValue;
    fireEvent(this, "value-changed", { value: this._value });
  }

  private _calcGutters(): string[] {
    return this.rtl ? ["rtl-gutter", "CodeMirror-linenumbers"] : [];
  }

  private _setScrollBarDirection(): void {
    if (this.codemirror) {
      this.codemirror.getWrapperElement().classList.toggle("rtl", this.rtl);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor": HaCodeEditor;
  }
}
