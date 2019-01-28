import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-input/paper-textarea";

import { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";

import "../../components/hui-code-editor";

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

  protected render(): TemplateResult | void {
    return html`
      ${this.renderStyle()}
      <hui-code-editor
        .value="${this._yaml}"
        @code-changed="${this._valueChanged}"
      >
      </hui-code-editor>
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

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "yaml-changed", {
      yaml: ev.detail.value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-yaml-editor": HuiYAMLEditor;
  }
}

customElements.define("hui-yaml-editor", HuiYAMLEditor);
