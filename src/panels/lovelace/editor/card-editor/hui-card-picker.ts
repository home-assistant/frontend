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
import { CardPickTarget, CardOption } from "../types";
import { fireEvent } from "../../../../common/dom/fire_event";
@customElement("hui-card-picker")
export class HuiCardPicker extends LitElement {
  public hass?: HomeAssistant;

  public cardPicked?: (cardConf: LovelaceCardConfig) => void;

  protected render(): TemplateResult | void {
    const cards: CardOption[] = [
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.alarm-panel.name"
        ),
        type: "alarm-panel",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.conditional.name"
        ),
        type: "conditional",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.entities.name"
        ),
        type: "entities",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.entity-button.name"
        ),
        type: "entity-button",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.entity-filter.name"
        ),
        type: "entity-filter",
      },
      {
        name: this.hass!.localize("ui.panel.lovelace.editor.card.gauge.name"),
        type: "gauge",
      },
      {
        name: this.hass!.localize("ui.panel.lovelace.editor.card.glance.name"),
        type: "glance",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.history-graph.name"
        ),
        type: "history-graph",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.horizontal-stack.name"
        ),
        type: "horizontal-stack",
      },
      {
        name: this.hass!.localize("ui.panel.lovelace.editor.card.iframe.name"),
        type: "iframe",
      },
      {
        name: this.hass!.localize("ui.panel.lovelace.editor.card.light.name"),
        type: "light",
      },
      {
        name: this.hass!.localize("ui.panel.lovelace.editor.card.map.name"),
        type: "map",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.markdown.name"
        ),
        type: "markdown",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.media-control.name"
        ),
        type: "media-control",
      },
      {
        name: this.hass!.localize("ui.panel.lovelace.editor.card.picture.name"),
        type: "picture",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.picture-elements.name"
        ),
        type: "picture-elements",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.picture-entity.name"
        ),
        type: "picture-entity",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.picture-glance.name"
        ),
        type: "picture-glance",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.plant-status.name"
        ),
        type: "plant-status",
      },
      {
        name: this.hass!.localize("ui.panel.lovelace.editor.card.sensor.name"),
        type: "sensor",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.shopping-list.name"
        ),
        type: "shopping-list",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.thermostat.name"
        ),
        type: "thermostat",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.vertical-stack.name"
        ),
        type: "vertical-stack",
      },
      {
        name: this.hass!.localize(
          "ui.panel.lovelace.editor.card.weather-forecast.name"
        ),
        type: "weather-forecast",
      },
    ];

    return html`
      <h3>
        ${this.hass!.localize("ui.panel.lovelace.editor.edit_card.pick_card")}
      </h3>
      <div class="cards-container">
        ${cards.map((card: CardOption) => {
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
