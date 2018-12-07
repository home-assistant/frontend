import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-textarea";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";

export class HuiYAMLEditor extends LitElement {
  protected hass?: HomeAssistant;
  private _yaml?: string;

  static get properties(): PropertyDeclarations {
    return { _yaml: {} };
  }

  set yaml(yaml: string) {
    if (yaml === undefined) {
      return;
    } else {
      this._yaml = yaml;
    }
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <paper-textarea
        max-rows="10"
        .value="${this._yaml}"
        @value-changed="${this._valueChanged}"
      ></paper-textarea>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        paper-textarea {
          --paper-input-container-shared-input-style_-_font-family: monospace;
        }
      </style>
    `;
  }

  private _valueChanged(ev: Event): void {
    const target = ev.target! as any;
    this._yaml = target.value;
    fireEvent(this, "yaml-changed", {
      yaml: target.value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-yaml-editor": HuiYAMLEditor;
  }
}

customElements.define("hui-yaml-editor", HuiYAMLEditor);
