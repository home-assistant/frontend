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
import computeDomain from "../../common/entity/compute_domain";

export class HuiUnusedEntities extends LitElement {
  private _hass?: HomeAssistant;
  private _config?: LovelaceConfig;
  private _elements?: LovelaceCard[];

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _config: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this._elements) {
      this._createElements();
      return;
    }
    for (const element of this._elements) {
      element.hass = this._hass;
    }
  }

  public setConfig(config: LovelaceConfig): void {
    this._config = config;
    this._createElements();
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div id="root">${this._elements}</div>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        #root {
          padding: 4px;
          display: flex;
          flex-wrap: wrap;
        }
        hui-entities-card {
          max-width: 400px;
          padding: 4px;
          flex: 1 auto;
        }
      </style>
    `;
  }

  private _createElements(): void {
    if (!this._hass) {
      return;
    }
    const domains: { [domain: string]: string[] } = {};
    computeUnusedEntities(this._hass, this._config!).forEach((entity) => {
      const domain = computeDomain(entity);

      if (!(domain in domains)) {
        domains[domain] = [];
      }
      domains[domain].push(entity);
    });
    this._elements = Object.keys(domains)
      .sort()
      .map((domain) => {
        const el = createCardElement({
          type: "entities",
          title: this._hass!.localize(`domain.${domain}`) || domain,
          entities: domains[domain].map((entity) => ({
            entity,
            secondary_info: "entity-id",
          })),
          show_header_toggle: false,
        });
        el.hass = this._hass;
        return el;
      });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-unused-entities": HuiUnusedEntities;
  }
}
customElements.define("hui-unused-entities", HuiUnusedEntities);
