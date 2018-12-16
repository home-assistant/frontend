import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";

import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { getCardElementTag } from "../../common/get-card-element-tag";
import { CardPickTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";

const cards = [
  { name: "Alarm panel", type: "alarm-panel" },
  { name: "Conditional", type: "conditional" },
  { name: "Entities", type: "entities" },
  { name: "Entity Button", type: "entity-button" },
  { name: "Entity Filter", type: "entity-filter" },
  { name: "Gauge", type: "gauge" },
  { name: "Geo Location Map", type: "geo-location-map" },
  { name: "Glance", type: "glance" },
  { name: "History Graph", type: "history-graph" },
  { name: "Horizontal Stack", type: "horizontal-stack" },
  { name: "iFrame", type: "iframe" },
  { name: "Light", type: "light" },
  { name: "Map", type: "map" },
  { name: "Markdown", type: "markdown" },
  { name: "Media Control", type: "media-control" },
  { name: "Picture", type: "picture" },
  { name: "Picture Elements", type: "picture-elements" },
  { name: "Picture Entity", type: "picture-entity" },
  { name: "Picture Glance", type: "picture-glance" },
  { name: "Plant Status", type: "plant-status" },
  { name: "Sensor", type: "sensor" },
  { name: "Shopping List", type: "shopping-list" },
  { name: "Thermostat", type: "thermostat" },
  { name: "Vertical Stack", type: "vertical-stack" },
  { name: "Weather Forecast", type: "weather-forecast" },
];

export class HuiCardPicker extends hassLocalizeLitMixin(LitElement) {
  public hass?: HomeAssistant;
  public cardPicked?: (cardConf: LovelaceCardConfig) => void;

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <h3>${this.localize("ui.panel.lovelace.editor.edit_card.pick_card")}</h3>
      <div class="cards-container">
        ${
          cards.map((card) => {
            return html`
              <paper-button
                raised
                @click="${this._cardPicked}"
                .type="${card.type}"
                >${card.name}</paper-button
              >
            `;
          })
        }
      </div>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .cards-container {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .cards-container paper-button {
          flex: 1 0 25%;
        }
      </style>
    `;
  }

  private _cardPicked(ev: Event): void {
    const type = (ev.currentTarget! as CardPickTarget).type;
    const tag = getCardElementTag(type);

    const elClass = customElements.get(tag);
    let config: LovelaceCardConfig = { type };

    if (elClass && elClass.getStubConfig) {
      const cardConfig = elClass.getStubConfig(this.hass);
      config = { ...config, ...cardConfig };
    }

    this.cardPicked!(config);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-picker": HuiCardPicker;
  }
}

customElements.define("hui-card-picker", HuiCardPicker);
