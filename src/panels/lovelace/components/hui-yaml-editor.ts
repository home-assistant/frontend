import * as CodeMirror from "codemirror";
import "codemirror/mode/yaml/yaml";
// @ts-ignore
import codeMirrorCSS from "codemirror/lib/codemirror.css";
import { fireEvent } from "../../../common/dom/fire_event";
declare global {
  interface HASSDomEvents {
    "yaml-changed": {
      value: string;
    };
  }
}

export class HuiYamlEditor extends HTMLElement {
  public codemirror: CodeMirror;
  private _value: string;

  public constructor() {
    super();
    this._value = "";
    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
            <style>
               ${codeMirrorCSS}
               .CodeMirror {
                    height: var(--code-mirror-height, 300px);
                    color: var(--code-mirror-color, black);
                    direction: var(--code-mirror-direction, ltr);
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

  public connectedCallback(): void {
    if (!this.codemirror) {
      this.codemirror = CodeMirror(this.shadowRoot, {
        value: this._value,
        lineNumbers: true,
        mode: "yaml",
        tabSize: 2,
        autofocus: true,
        extraKeys: {
          Tab: (cm: CodeMirror) => {
            const spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
            cm.replaceSelection(spaces);
          },
        },
      });
      fireEvent(this, "yaml-changed", { value: this._value });
      this.codemirror.on("changes", () => this._onChange());
    } else {
      this.codemirror.refresh();
    }
  }

  private _onChange(): void {
    fireEvent(this, "yaml-changed", { value: this.codemirror.getValue() });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-yaml-editor": HuiYamlEditor;
  }
}

window.customElements.define("hui-yaml-editor", HuiYamlEditor);
