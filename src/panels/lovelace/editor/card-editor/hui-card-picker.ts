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

const cards: string[] = [
  "alarm-panel",
  "conditional",
  "entities",
  "entity-button",
  "entity-filter",
  "gauge",
  "glance",
  "history-graph",
  "horizontal-stack",
  "iframe",
  "light",
  "map",
  "markdown",
  "media-control",
  "picture",
  "picture-elements",
  "picture-entity",
  "picture-glance",
  "plant-status",
  "sensor",
  "shopping-list",
  "thermostat",
  "vertical-stack",
  "weather-forecast",
];

@customElement("hui-card-picker")
export class HuiCardPicker extends LitElement {
  public hass?: HomeAssistant;

  public cardPicked?: (cardConf: LovelaceCardConfig) => void;

  protected render(): TemplateResult {
    return html`
      <div class="cards-container">
        ${cards.map((card: string) => {
          return html`
            <mwc-button @click="${this._cardPicked}" .type="${card}">
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.card.${card}.name`
              )}
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
