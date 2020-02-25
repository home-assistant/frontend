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

import "../../../../components/ha-card";

import { CardPickTarget, CardPickerConfig } from "../types";
import { HuiErrorCard } from "../../cards/hui-error-card";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { LovelaceCardConfig, LovelaceConfig } from "../../../../data/lovelace";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  getCardElementClass,
  createCardElement,
} from "../../create-element/create-card-element";
import {
  computeUnusedEntities,
  computeUsedEntities,
  EXCLUDED_DOMAINS,
} from "../../common/compute-unused-entities";

const cardConfigs: CardPickerConfig[] = [
  {
    lovelaceCardConfig: { type: "alarm-panel" },
    includeDomains: ["alarm_control_panel"],
    name: "Alarm Panel",
  },
  {
    lovelaceCardConfig: { type: "entities" },
    numberOfEntities: 3,
    name: "Entities",
  },
  { lovelaceCardConfig: { type: "button" }, name: "Button" },
  {
    lovelaceCardConfig: { type: "conditional" },
    name: "Conditional",
    description: "Displays another card based on entity states.",
    noPreview: true,
  },
  {
    lovelaceCardConfig: { type: "entity-filter" },
    name: "Entity Filter",
    description:
      "This card allows you to define a list of entities that you want to track only when in a certain state.",
    noPreview: true,
  },
  {
    lovelaceCardConfig: { type: "gauge" },
    includeDomains: ["sensor"],
    name: "Gauge",
  },
  {
    lovelaceCardConfig: { type: "glance" },
    numberOfEntities: 3,
    name: "Glance",
  },
  {
    lovelaceCardConfig: { type: "history-graph" },
    includeDomains: ["sensor"],
    numberOfEntities: 2,
    name: "History Graph",
  },
  {
    lovelaceCardConfig: { type: "horizontal-stack" },
    name: "Horizontal Stack",
    description:
      "Horizontal stack card allows you to stack together multiple cards, so they always sit next to each other in the space of one column.",
    noPreview: true,
  },
  {
    lovelaceCardConfig: {
      type: "iframe",
      url: "https://www.home-assistant.io",
      aspect_ratio: "50%",
    },
    name: "iFrame",
    noEntity: true,
  },
  {
    lovelaceCardConfig: { type: "light" },
    includeDomains: ["light"],
    name: "Light",
  },
  {
    lovelaceCardConfig: { type: "map", default_zoom: 6 },
    includeDomains: ["device_tracker"],
    name: "Map",
    numberOfEntities: 1,
  },
  {
    lovelaceCardConfig: {
      type: "markdown",
      content:
        "The **Markdown** card allows you to write any text. You can style it **bold**, *italicized*, ~strikethrough~ etc. You can do images, links, and more. For more information see the [Markdown Cheatsheet](https://commonmark.org/help).",
    },
    name: "Markdown",
    noEntity: true,
  },
  {
    lovelaceCardConfig: { type: "media-control" },
    includeDomains: ["media_player"],
    name: "Media Control",
  },
  {
    lovelaceCardConfig: {
      type: "picture",
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
    },
    name: "Picture",
    noEntity: true,
  },
  {
    lovelaceCardConfig: {
      type: "picture-entity",
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
    },
    name: "Picture Entity",
  },
  {
    lovelaceCardConfig: {
      type: "picture-glance",
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
    },
    numberOfEntities: 2,
    name: "Picture Glance",
  },
  {
    lovelaceCardConfig: {
      type: "plant-status",
    },
    includeDomains: ["plant"],
    name: "Plant Status",
    description: "A card for all the lovely botanists out there.",
  },
  {
    lovelaceCardConfig: { type: "sensor", graph: "line" },
    includeDomains: ["sensor"],
    name: "Sensor",
  },
  {
    lovelaceCardConfig: { type: "shopping-list" },
    name: "Shopping List",
    description:
      "The Shopping List Card allows you to add, edit, check-off, and clear items from your shopping list.",
    noPreview: true,
  },
  {
    lovelaceCardConfig: { type: "thermostat" },
    includeDomains: ["climate"],
    name: "Thermostat",
  },
  {
    lovelaceCardConfig: { type: "weather-forecast" },
    includeDomains: ["weather"],
    name: "Weather Forecast",
  },
  {
    lovelaceCardConfig: { type: "vertical-stack" },
    name: "Vertical Stack",
    description:
      "Vertical stack allows you to group multiple cards so they always sit in the same column.",
    noPreview: true,
  },
];

@customElement("hui-card-picker")
export class HuiCardPicker extends LitElement {
  public hass?: HomeAssistant;
  public lovelace?: LovelaceConfig;
  public entities?: string[];
  public cardPicked?: (cardConf: LovelaceCardConfig) => void;
  private filteredCardConfigs?: CardPickerConfig[];

  public connectedCallback(): void {
    super.connectedCallback();

    this.filteredCardConfigs = cardConfigs.map((cardConfig) => {
      if (cardConfig.noPreview || cardConfig.noEntity) {
        return cardConfig;
      }

      const entityIds = this._getCardEntities(cardConfig);

      if (!entityIds.length) {
        cardConfig.noPreview = true;
      } else if (!cardConfig.numberOfEntities) {
        cardConfig.lovelaceCardConfig = {
          ...cardConfig.lovelaceCardConfig!,
          entity: entityIds[0],
        };
      } else {
        cardConfig.lovelaceCardConfig = {
          ...cardConfig.lovelaceCardConfig!,
          entities: entityIds.slice(0, cardConfig.numberOfEntities),
        };
      }

      return cardConfig;
    });
  }

  protected render(): TemplateResult {
    return html`
      <h2>Main</h2>
      <div class="cards-container">
        ${this.filteredCardConfigs!.filter(
          (cardConfig) => !cardConfig.noPreview
        ).map((cardConfig: CardPickerConfig) => {
          return html`
            ${until(
              this._renderCardElement(cardConfig),
              html`
                <paper-spinner active alt="Loading"></paper-spinner>
              `
            )}
          `;
        })}
      </div>
      <h2>Other</h2>
      <div class="cards-container">
        ${this.filteredCardConfigs!.filter(
          (cardConfig) => cardConfig.noPreview === true
        ).map((cardConfig: CardPickerConfig) => {
          return html`
            ${until(
              this._renderCardElement(cardConfig),
              html`
                <paper-spinner active alt="Loading"></paper-spinner>
              `
            )}
          `;
        })}
      </div>
      <h2>Manual</h2>
      <div class="cards-container">
        <div class="card" @click="${this._manualPicked}">
          <ha-card .header=${"Manual"}>
            <div>
              Need to add a custom card or just want to manually write the yaml?
            </div>
          </ha-card>
        </div>
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

        .card {
          width: calc(33% - 8px);
          margin: 4px;
        }

        @media all and (max-width: 780px), all and (max-height: 500px) {
          .card {
            flex: 1 0 100%;
          }
        }

        @media all and (max-width: 1200px), all and (max-height: 500px) {
          .card {
            width: calc(50% - 8px);
          }
        }

        ha-card {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        ha-card > :first-child {
          pointer-events: none;
          margin: 0 20px 20px 20px;
        }

        .options {
          border-top: 1px solid #e8e8e8;
          padding: 5px 8px;
          display: flex;
          margin-top: 8px;
        }

        .options .primary-actions {
          flex: 1;
          margin: auto;
        }

        paper-icon-button {
          color: var(--primary-text-color);
          cursor: pointer;
        }

        .preview-text {
          color: var(--disabled-text-color);
          font-size: 18px;
          margin-top: 0;
        }

        .preview > :nth-child(2) {
          zoom: 0.6;
          -moz-transform: scale(0.6); /* Firefox */
          -moz-transform-origin: 0 0;
          -o-transform: scale(0.6); /* Opera */
          -o-transform-origin: 0 0;
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
    const config: LovelaceCardConfig = (ev.currentTarget! as CardPickTarget)
      .config;

    fireEvent(this, "config-changed", { config });
  }

  private async _getCardConfig(
    cardConfig: CardPickerConfig
  ): Promise<LovelaceCardConfig | undefined> {
    if (!this.hass) {
      return undefined;
    }

    let config: LovelaceCardConfig = cardConfig.lovelaceCardConfig;

    if (cardConfig.noEntity) {
      return config;
    }

    const elClass = await getCardElementClass(
      cardConfig.lovelaceCardConfig.type
    );

    if (elClass && elClass.getStubConfig) {
      const stubConfig = elClass.getStubConfig(this.hass!);
      config = { ...stubConfig, ...config };
    }

    return config;
  }

  private _getCardEntities(cardConfig: CardPickerConfig): string[] {
    let entityIds: string[] =
      this.entities || computeUnusedEntities(this.hass!, this.lovelace!);

    if (cardConfig.includeDomains && cardConfig.includeDomains.length) {
      entityIds = entityIds.filter((eid) =>
        cardConfig.includeDomains!.includes(computeDomain(eid))
      );
    }

    if (entityIds.length < (cardConfig.numberOfEntities || 1)) {
      let usedEntityIds = [...computeUsedEntities(this.lovelace)].filter(
        (eid) => !EXCLUDED_DOMAINS.includes(eid)[0]
      );

      if (cardConfig.includeDomains && cardConfig.includeDomains.length) {
        usedEntityIds = usedEntityIds.filter((eid) =>
          cardConfig.includeDomains!.includes(computeDomain(eid))
        );
      }

      entityIds = [...entityIds, ...usedEntityIds];
    }

    return entityIds;
  }

  private async _renderCardElement(
    cardConfig: CardPickerConfig
  ): Promise<TemplateResult> {
    let element: LovelaceCard | HuiErrorCard | undefined;

    const lovelaceCardConfig = await this._getCardConfig(cardConfig);

    if (!cardConfig.noPreview) {
      element = createCardElement(lovelaceCardConfig!);
      element.hass = this.hass;
    }

    return html`
      <div
        class="card"
        @click="${this._cardPicked}"
        .config="${lovelaceCardConfig}"
      >
        <ha-card .header=${cardConfig.name}>
          ${!element
            ? html`
                <div>${cardConfig.description}</div>
              `
            : html`
                <div class="preview">
                  <p class="preview-text">Preview:</p>
                  ${element}
                </div>
              `}
        </ha-card>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-picker": HuiCardPicker;
  }
}
