import {
  html,
  css,
  LitElement,
  TemplateResult,
  CSSResult,
  customElement,
} from "lit-element";
import "@material/mwc-button";

import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { getCardElementTag } from "../../common/get-card-element-tag";
import { CardPickTarget } from "../types";
import { fireEvent } from "../../../../common/dom/fire_event";

const cards = [
  { name: "Alarm panel", type: "alarm-panel" },
  { name: "Conditional", type: "conditional" },
  { name: "Entities", type: "entities" },
  { name: "Entity Button", type: "entity-button" },
  { name: "Entity Filter", type: "entity-filter" },
  { name: "Gauge", type: "gauge" },
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

@customElement("hui-card-picker")
export class HuiCardPicker extends LitElement {
  public hass?: HomeAssistant;

  public cardPicked?: (cardConf: LovelaceCardConfig) => void;

  protected render(): TemplateResult | void {
    return html`
      <h3>
        ${this.hass!.localize("ui.panel.lovelace.editor.edit_card.pick_card")}
      </h3>
      <div class="cards-container">
        ${cards.map((card) => {
          return html`
            <mwc-button @click="${this._cardPicked}" .type="${card.type}">
              ${card.name}
            </mwc-button>
          `;
        })}
      </div>
      <div class="cards-container">
        <mwc-button @click="${this._manualPicked}">MANUAL CARD</mwc-button>
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .cards-container {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .cards-container mwc-button {
          flex: 1 0 25%;
          margin: 4px;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          .cards-container mwc-button {
            flex: 1 0 33%;
          }
        }
      `,
    ];
  }

  private _manualPicked(): void {
    fireEvent(this, "config-changed", {
      config: { type: "" },
    });
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

    fireEvent(this, "config-changed", { config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-picker": HuiCardPicker;
  }
}
