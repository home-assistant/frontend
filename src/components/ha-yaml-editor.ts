// @ts-ignore
import CodeMirror from "codemirror";
import "codemirror/mode/yaml/yaml";
// @ts-ignore
import codeMirrorCSS from "codemirror/lib/codemirror.css";
import { fireEvent } from "../common/dom/fire_event";
import { customElement } from "lit-element";

declare global {
  interface HASSDomEvents {
    "yaml-changed": {
      value: string;
    };
    "yaml-save": undefined;
  }
}

@customElement("ha-yaml-editor")
export class HaYamlEditor extends HTMLElement {
  public codemirror?: any;
  private _autofocus = false;
  private _rtl = false;
  private _value: string;

  public constructor() {
    super();
    CodeMirror.commands.save = (cm: CodeMirror) => {
      fireEvent(cm.getWrapperElement(), "yaml-save");
    };
    this._value = "";
    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
            <style>
              ${codeMirrorCSS}
              .CodeMirror {
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
  }

  set value(value: string) {
    if (this.codemirror) {
      if (value !== this.codemirror.getValue()) {
        this.codemirror.setValue(value);
      }
    }
    this._value = value;
  }

  get value(): string {
    return this.codemirror.getValue();
  }

  set rtl(rtl: boolean) {
    this._rtl = rtl;
    this.setScrollBarDirection();
  }

  set autofocus(autofocus: boolean) {
    this._autofocus = autofocus;
    if (this.codemirror) {
      this.codemirror.focus();
    }
  }

  set error(error: boolean) {
    this.classList.toggle("error-state", error);
  }

  get hasComments(): boolean {
    return this.shadowRoot!.querySelector("span.cm-comment") ? true : false;
  }

  public connectedCallback(): void {
    if (!this.codemirror) {
      this.codemirror = CodeMirror(
        (this.shadowRoot as unknown) as HTMLElement,
        {
          value: this._value,
          lineNumbers: true,
          mode: "yaml",
          tabSize: 2,
          autofocus: this._autofocus,
          viewportMargin: Infinity,
          extraKeys: {
            Tab: "indentMore",
            "Shift-Tab": "indentLess",
          },
          gutters: this._rtl ? ["rtl-gutter", "CodeMirror-linenumbers"] : [],
        }
      );
      this.setScrollBarDirection();
      this.codemirror.on("changes", () => this._onChange());
    } else {
      this.codemirror.refresh();
    }
  }

  private _onChange(): void {
    fireEvent(this, "yaml-changed", { value: this.codemirror.getValue() });
  }

  private setScrollBarDirection(): void {
    if (this.codemirror) {
      this.codemirror.getWrapperElement().classList.toggle("rtl", this._rtl);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-yaml-editor": HaYamlEditor;
  }
}
