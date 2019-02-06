// @ts-ignore
import CodeMirror from "codemirror";
import "codemirror/mode/yaml/yaml";
// @ts-ignore
import codeMirrorCSS from "codemirror/lib/codemirror.css";
import { fireEvent } from "../../../common/dom/fire_event";
declare global {
  interface HASSDomEvents {
    "yaml-changed": {
      value: string;
    };
    "yaml-save": {};
  }
}

export class HuiYamlEditor extends HTMLElement {
  public codemirror: CodeMirror;
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
                  height: var(--code-mirror-height, 300px);
                  direction: var(--code-mirror-direction, ltr);
                }
                .CodeMirror-gutters {
                  border-right: 1px solid var(--paper-input-container-color, var(--secondary-text-color));
                  background-color: var(--paper-dialog-background-color, var(--primary-background-color));
                  transition: 0.2s ease border-right;
                }
                .CodeMirror-focused .CodeMirror-gutters {
                  border-right: 2px solid var(--paper-input-container-focus-color, var(--primary-color));;
                }
                .CodeMirror-linenumber {
                  color: var(--paper-dialog-color, var(--primary-text-color));
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

  get hasComments(): boolean {
    return this.shadowRoot!.querySelector("span.cm-comment") ? true : false;
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
