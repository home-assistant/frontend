import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { fireEvent } from "../../../common/dom/fire_event";

import "@polymer/paper-input/paper-textarea";
import { TemplateResult } from "lit-html";

export class HuiYAMLEditor extends LitElement {
  public yaml?: string;

  static get properties(): PropertyDeclarations {
    return {
      yaml: {},
    };
  }

  protected render(): TemplateResult {
    return html`
      <style>
        paper-textarea {
          --paper-input-container-shared-input-style_-_font-family: monospace;
        }
      </style>
      <paper-textarea
        value="${this.yaml}"
        @value-changed="${this._valueChanged}"
      ></paper-textarea>
    `;
  }

  private _valueChanged(ev: MouseEvent): void {
    const target = ev.target! as any;
    this.yaml = target.value;
    fireEvent(this, "yaml-changed", { yaml: target.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-yaml-editor": HuiYAMLEditor;
  }
}

customElements.define("hui-yaml-editor", HuiYAMLEditor);
