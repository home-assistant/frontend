// @ts-ignore
import CodeMirror from "codemirror";
import "codemirror/mode/yaml/yaml";
// @ts-ignore
import codeMirrorCSS from "codemirror/lib/codemirror.css";
import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeRTL } from "../../../common/util/compute_rtl";
import { customElement } from "lit-element";

declare global {
  interface HASSDomEvents {
    "yaml-changed": {
      value: string;
    };
    "yaml-save": undefined;
  }
}

@customElement("hui-yaml-editor")
export class HuiYamlEditor extends HTMLElement {
  public _hass?: HomeAssistant;

  public codemirror!: any;

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
              .CodeMirror-focused .CodeMirror-gutters {
                border-right: 2px solid var(--paper-input-container-focus-color, var(--primary-color));;
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

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._hass) {
      this.setScrollBarDirection();
    }
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
      this.codemirror = CodeMirror(
        (this.shadowRoot as unknown) as HTMLElement,
        {
          value: this._value,
          lineNumbers: true,
          mode: "yaml",
          tabSize: 2,
          autofocus: true,
          viewportMargin: Infinity,
          extraKeys: {
            Tab: "indentMore",
            "Shift-Tab": "indentLess",
          },
          gutters:
            this._hass && computeRTL(this._hass!)
              ? ["rtl-gutter", "CodeMirror-linenumbers"]
              : [],
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
    if (!this.codemirror) {
      return;
    }

    this.codemirror
      .getWrapperElement()
      .classList.toggle("rtl", computeRTL(this._hass!));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-yaml-editor": HuiYamlEditor;
  }
}
