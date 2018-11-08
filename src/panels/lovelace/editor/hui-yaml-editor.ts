import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-textarea";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { getCardConfig } from "../common/data";

export class HuiYAMLEditor extends LitElement {
  public yaml?: string;
  public cardId?: string;
  private _hass?: HomeAssistant;

  static get properties(): PropertyDeclarations {
    return { yaml: {}, cardId: { type: String } };
  }

  set hass(value: HomeAssistant) {
    this._hass = value;
    if (!this.yaml || this.yaml === "") {
      this._loadConfig();
    }
  }

  constructor() {
    super();
  }

  protected render(): TemplateResult {
    return html`
      <style>
        paper-textarea {
          --paper-input-container-shared-input-style_-_font-family: monospace;
        }
      </style>
      <paper-textarea
        max-rows="10"
        value="${this.yaml}"
        @value-changed="${this._valueChanged}"
      ></paper-textarea>
    `;
  }

  private async _loadConfig(): Promise<void> {
    this.yaml = await getCardConfig(this._hass!, this.cardId!);
  }

  private _valueChanged(ev: MouseEvent): void {
    const target = ev.target! as any;
    this.yaml = target.value;
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
