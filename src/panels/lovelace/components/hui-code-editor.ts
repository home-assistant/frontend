import CodeMirror from "codemirror";
import "codemirror/mode/yaml/yaml";
// tslint:disable-next-line
import codeMirrorCSS from "codemirror/lib/codemirror.css";
import { fireEvent } from "../../../common/dom/fire_event";

let _this;

declare global {
  interface HASSDomEvents {
    "code-changed": {
      value: string;
    };
  }
}

export class HuiCodeEditor extends HTMLElement {
  public codemirror;
  private _value;

  constructor() {
    super();
    _this = this;
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

  get value() {
    return this.codemirror.getValue();
  }

  public connectedCallback() {
    if (!this.codemirror) {
      this.codemirror = CodeMirror(this.shadowRoot, {
        value: this._value,
        lineNumbers: true,
        mode: "yaml",
        tabSize: 2,
      });
      this.codemirror.on("changes", () => this._onChange());
    } else {
      this.codemirror.refresh();
    }
  }

  private _onChange() {
    fireEvent(_this, "code-changed", { value: _this.codemirror.getValue() });
  }
}

window.customElements.define("hui-code-editor", HuiCodeEditor);
