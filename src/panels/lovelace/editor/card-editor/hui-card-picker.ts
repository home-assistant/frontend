import {
  html,
  css,
  LitElement,
  TemplateResult,
  CSSResult,
  customElement,
} from "lit-element";
import "@material/mwc-button";
import { until } from "lit-html/directives/until";

import { CardPickTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { LovelaceCardConfig, LovelaceConfig } from "../../../../data/lovelace";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  getCardElementClass,
  createCardElement,
} from "../../create-element/create-card-element";
import { classMap } from "lit-html/directives/class-map";

const previewCards: string[] = [
  "alarm-panel",
  "entities",
  "button",
  "gauge",
  "glance",
  "history-graph",
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
  "thermostat",
  "weather-forecast",
];

const nonPreviewCards: string[] = [
  "conditional",
  "entity-filter",
  "horizontal-stack",
  "vertical-stack",
  "shopping-list",
];

@customElement("hui-card-picker")
export class HuiCardPicker extends LitElement {
  public hass?: HomeAssistant;
  public lovelace?: LovelaceConfig;
  public cardPicked?: (cardConf: LovelaceCardConfig) => void;

  protected render(): TemplateResult {
    return html`
      <h2>
        ${this.hass!.localize(
          `ui.panel.lovelace.editor.edit_card.preview_cards`
        )}
      </h2>
      <div class="cards-container">
        ${previewCards.map((type: string) => {
          return html`
            ${until(
              this._renderCardElement(type),
              html`
                <paper-spinner active alt="Loading"></paper-spinner>
              `
            )}
          `;
        })}
      </div>
      <h2>
        ${this.hass!.localize(`ui.panel.lovelace.editor.edit_card.other`)}
      </h2>
      <div class="cards-container">
        ${nonPreviewCards.map((type: string) => {
          return html`
            ${until(
              this._renderCardElement(type, true),
              html`
                <paper-spinner active alt="Loading"></paper-spinner>
              `
            )}
          `;
        })}
      </div>
      <h2>
        ${this.hass!.localize(`ui.panel.lovelace.editor.edit_card.misc`)}
      </h2>
      <div class="cards-container">
        <div
          class="card"
          @click="${this._cardPicked}"
          .config="${{ type: "" }}"
        >
          <div class="preview description">
            ${this.hass!.localize(
              `ui.panel.lovelace.editor.card.generic.manual_description`
            )}
          </div>
          <div class="card-header">
            ${this.hass!.localize(
              `ui.panel.lovelace.editor.card.generic.manual`
            )}
          </div>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .cards-container {
          display: grid;
          grid-gap: 8px 8px;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }

        .card {
          height: 100%;
          display: flex;
          flex-direction: column;
          border-radius: 4px;
          border: 1px solid var(--divider-color);
          background: var(--primary-background-color, #fafafa);
          cursor: pointer;
          box-sizing: border-box;
        }

        .card-header {
          color: var(--ha-card-header-color, --primary-text-color);
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: 16px;
          letter-spacing: -0.012em;
          line-height: 20px;
          padding: 12px 16px;
          display: block;
          text-align: center;
          background: white;
          border-radius: 0 0 4px 4px;
          border-top: 1px solid var(--divider-color);
        }

        .preview {
          pointer-events: none;
          margin: 20px;
          flex: 1 1 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview > :first-child {
          zoom: 0.6;
          -moz-transform: scale(0.6); /* Firefox */
          -moz-transform-origin: 0 0;
          -o-transform: scale(0.6); /* Opera */
          -o-transform-origin: 0 0;
          display: block;
          width: 100%;
        }

        .description {
          text-align: center;
        }
      `,
    ];
  }

  private _cardPicked(ev: Event): void {
    const config: LovelaceCardConfig = (ev.currentTarget! as CardPickTarget)
      .config;

    fireEvent(this, "config-changed", { config });
  }

  private async _getCardConfig(type: string): Promise<LovelaceCardConfig> {
    let cardConfig: LovelaceCardConfig = { type };

    if (!this.hass || !this.lovelace) {
      return cardConfig;
    }
    const elClass = await getCardElementClass(type);

    if (elClass && elClass.getStubConfig) {
      const classStubConfig = elClass.getStubConfig(this.hass, this.lovelace);
      cardConfig = { ...cardConfig, ...classStubConfig };
    }

    return cardConfig;
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = createCardElement(cardConfig) as LovelaceCard;
    element.hass = this.hass;
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        element.parentElement!.replaceChild(
          this._createCardElement(cardConfig),
          element
        );
      },
      { once: true }
    );
    return element;
  }

  private async _renderCardElement(
    type: string,
    noElement: boolean = false
  ): Promise<TemplateResult> {
    let element: LovelaceCard | undefined;

    const cardConfig = await this._getCardConfig(type);

    if (!noElement) {
      element = this._createCardElement(cardConfig);
    }

    return html`
      <div class="card" @click="${this._cardPicked}" .config="${cardConfig}">
        <div class="preview ${classMap({ description: !element })}">
          ${!element
            ? html`
                ${this.hass!.localize(
                  `ui.panel.lovelace.editor.card.${cardConfig.type}.description`
                )}
              `
            : html`
                ${element}
              `}
        </div>
        <div class="card-header">
          ${this.hass!.localize(
            `ui.panel.lovelace.editor.card.${cardConfig.type}.name`
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-picker": HuiCardPicker;
  }
}
