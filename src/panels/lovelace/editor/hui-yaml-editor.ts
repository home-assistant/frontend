import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-spinner/paper-spinner";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { getCardConfig } from "../../../data/lovelace";

export class HuiYAMLEditor extends LitElement {
  public cardId?: string;
  protected hass?: HomeAssistant;
  private _yaml?: string;
  private _loading?: boolean;

  static get properties(): PropertyDeclarations {
    return { _yaml: {}, cardId: {} };
  }

  set yaml(yaml: string) {
    if (yaml === undefined) {
      this._loading = true;
      this._loadConfig();
    } else {
      this._yaml = yaml;
      if (this._loading) {
        this._loading = false;
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <paper-spinner
        ?active="${this._loading}"
        alt="Loading"
        class="center"
      ></paper-spinner>
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
        .center {
          margin-left: auto;
          margin-right: auto;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
      </style>
    `;
  }

  private async _loadConfig(): Promise<void> {
    if (!this.hass || !this.cardId) {
      return;
    }

    this._yaml = await getCardConfig(this.hass, this.cardId);
    if (this._loading) {
      this._loading = false;
    }
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
