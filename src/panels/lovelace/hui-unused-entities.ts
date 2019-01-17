import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";

import "./cards/hui-entities-card";

import { computeUnusedEntities } from "./common/compute-unused-entities";
import { createCardElement } from "./common/create-card-element";
import { HomeAssistant } from "../../types";
import { LovelaceCard } from "./types";
import { LovelaceConfig } from "../../data/lovelace";

export class HuiUnusedEntities extends LitElement {
  private _hass?: HomeAssistant;
  private _config?: LovelaceConfig;
  private _element?: LovelaceCard;

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _config: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this._element) {
      this._createElement();
      return;
    }
    this._element.hass = this._hass;
  }

  public setConfig(config: LovelaceConfig): void {
    this._config = config;
    this._createElement();
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div id="root">${this._element}</div>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        #root {
          max-width: 600px;
          margin: 0 auto;
          padding: 8px 0;
        }
      </style>
    `;
  }

  private _createElement(): void {
    if (this._hass) {
      const entities = computeUnusedEntities(this._hass, this._config!).map(
        (entity) => ({
          entity,
          secondary_info: "entity-id",
        })
      );
      this._element = createCardElement({
        type: "entities",
        title: "Unused entities",
        entities,
        show_header_toggle: false,
      });
      this._element!.hass = this._hass;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-unused-entities": HuiUnusedEntities;
  }
}
customElements.define("hui-unused-entities", HuiUnusedEntities);
