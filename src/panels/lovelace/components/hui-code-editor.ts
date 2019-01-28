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
  public cm;
  private _value;

  constructor() {
    super();
    _this = this;
    this._value = "";
    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
            <style>
               ${codeMirrorCSS}
            </style>`;
  }

  set value(value: string) {
    if (this.cm) {
      if (value !== this.cm.getValue()) {
        this.cm.setValue(value);
      }
    }
    this._value = value;
  }

  public connectedCallback() {
    if (!this.cm) {
      this.cm = CodeMirror(this.shadowRoot, {
        value: this._value,
        lineNumbers: true,
        mode: "yaml",
        tabSize: 2,
      });
      this.cm.on("changes", this._onChange);
    } else {
      this.cm.refresh();
    }
  }

  private _onChange() {
    fireEvent(_this, "code-changed", { value: _this.cm.getValue() });
  }
}

window.customElements.define("hui-code-editor", HuiCodeEditor);
