import {
  html,
  css,
  LitElement,
  TemplateResult,
  CSSResult,
  customElement,
  property,
  PropertyValues,
} from "lit-element";
import { until } from "lit-html/directives/until";
import { classMap } from "lit-html/directives/class-map";

import { CardPickTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { LovelaceCardConfig, LovelaceConfig } from "../../../../data/lovelace";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCardElement } from "../../create-element/create-card-element";
import { getCardStubConfig } from "../get-card-stub-config";
import {
  computeUnusedEntities,
  computeUsedEntities,
} from "../../common/compute-unused-entities";

const previewCards: string[] = [
  "alarm-panel",
  "entities",
  "button",
  "gauge",
  "glance",
  "history-graph",
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
  "iframe",
  "vertical-stack",
  "shopping-list",
];

@customElement("hui-card-picker")
export class HuiCardPicker extends LitElement {
  @property() public hass?: HomeAssistant;
  public lovelace?: LovelaceConfig;
  public cardPicked?: (cardConf: LovelaceCardConfig) => void;
  private _unusedEntities?: string[];
  private _usedEntities?: string[];

  protected render(): TemplateResult {
    if (
      !this.hass ||
      !this.lovelace ||
      !this._unusedEntities ||
      !this._usedEntities
    ) {
      return html``;
    }

    return html`
      <div class="cards-container">
        ${previewCards.map((type: string) => {
          return html`
            ${until(
              this._renderCardElement(type),
              html`
                <div class="card spinner">
                  <paper-spinner active alt="Loading"></paper-spinner>
                </div>
              `
            )}
          `;
        })}
        ${nonPreviewCards.map((type: string) => {
          return html`
            ${until(
              this._renderCardElement(type, true),
              html`
                <div class="card spinner">
                  <paper-spinner active alt="Loading"></paper-spinner>
                </div>
              `
            )}
          `;
        })}
      </div>
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass) {
      return true;
    }

    if (oldHass.language !== this.hass!.language) {
      return true;
    }

    return false;
  }

  protected firstUpdated(): void {
    if (!this.hass || !this.lovelace) {
      return;
    }

    this._unusedEntities = computeUnusedEntities(this.hass, this.lovelace);
    this._usedEntities = [...computeUsedEntities(this.lovelace)];
    this.requestUpdate();
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .cards-container {
          display: grid;
          grid-gap: 8px 8px;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          margin-top: 20px;
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
          background: var(
            --ha-card-background,
            var(--paper-card-background-color, white)
          );
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

        .spinner {
          align-items: center;
          justify-content: center;
        }
      `,
    ];
  }

  private _cardPicked(ev: Event): void {
    const config: LovelaceCardConfig = (ev.currentTarget! as CardPickTarget)
      .config;

    fireEvent(this, "config-changed", { config });
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
    let cardConfig: LovelaceCardConfig = { type };

    if (this.hass && this.lovelace) {
      cardConfig = await getCardStubConfig(
        this.hass,
        this.lovelace,
        type,
        this._unusedEntities,
        this._usedEntities
      );

      if (!noElement) {
        element = this._createCardElement(cardConfig);
      }
    }

    return html`
      <div class="card" @click="${this._cardPicked}" .config="${cardConfig}">
        <div
          class="preview ${classMap({
            description: !element || element.tagName === "HUI-ERROR-CARD",
          })}"
        >
          ${!element || element.tagName === "HUI-ERROR-CARD"
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
