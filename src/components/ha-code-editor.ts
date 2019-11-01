import { loadCodeMirror } from "../resources/codemirror.ondemand";
import { fireEvent } from "../common/dom/fire_event";
import {
  UpdatingElement,
  property,
  customElement,
  PropertyValues,
} from "lit-element";
import { Editor } from "codemirror";

declare global {
  interface HASSDomEvents {
    "editor-save": undefined;
  }
}

@customElement("ha-code-editor")
export class HaCodeEditor extends UpdatingElement {
  public codemirror?: Editor;
  @property() public mode?: string;
  @property() public autofocus = false;
  @property() public rtl = false;
  @property() public error = false;
  @property() private _value = "";

  public set value(value: string) {
    this._value = value;
  }

  public get value(): string {
    return this.codemirror ? this.codemirror.getValue() : this._value;
  }

  public get hasComments(): boolean {
    return this.shadowRoot!.querySelector("span.cm-comment") ? true : false;
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
        background-color: var(--paper-dialog-background-color, var(--primary-background-color));
        color: var(--primary-text-color);
        height: var(--code-mirror-height, auto);
        direction: var(--code-mirror-direction, ltr);
      }
      .CodeMirror-scroll {
        max-height: var(--code-mirror-max-height, --code-mirror-height);
      }
      .CodeMirror-gutters {
        border-right: 1px solid var(--paper-input-container-color, var(--secondary-text-color));
        background-color: var(--paper-dialog-background-color, var(--primary-background-color));
        transition: 0.2s ease border-right;
      }
      :host(.error-state) .CodeMirror-gutters {
        border-color: var(--error-state-color, red);
      }
      .CodeMirror-focused .CodeMirror-gutters {
        border-right: 2px solid var(--paper-input-container-focus-color, var(--primary-color));
      }
      .CodeMirror-linenumber {
        color: var(--paper-dialog-color, var(--primary-text-color));
      }
      .rtl .CodeMirror-vscrollbar {
        right: auto;
        left: 0px;
      }
      .rtl-gutter {
        width: 20px;
      }
    </style>`;

    this.codemirror = codeMirror(shadowRoot, {
      value: this._value,
      lineNumbers: true,
      tabSize: 2,
      mode: this.mode,
      autofocus: this.autofocus !== false,
      viewportMargin: Infinity,
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
