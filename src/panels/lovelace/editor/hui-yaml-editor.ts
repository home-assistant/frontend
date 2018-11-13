import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-textarea";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { getCardConfig } from "../common/data";

export class HuiYAMLEditor extends LitElement {
  public cardId?: string;
  private _yaml?: string;
  private hass?: HomeAssistant;

  static get properties(): PropertyDeclarations {
    return { _yaml: {}, cardId: {} };
  }

  set yaml(yaml: string) {
    if (yaml === "") {
      this._loadConfig();
    } else {
      this._yaml = yaml;
    }
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
        .value="${this._yaml}"
        @value-changed="${this._valueChanged}"
      ></paper-textarea>
    `;
  }

  private async _loadConfig(): Promise<void> {
    this._yaml = await getCardConfig(this.hass!, this.cardId!);
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
