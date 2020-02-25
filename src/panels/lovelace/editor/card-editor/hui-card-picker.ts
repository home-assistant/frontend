import {
  html,
  css,
  LitElement,
  TemplateResult,
  CSSResult,
  customElement,
} from "lit-element";
import "@material/mwc-button";

import "../../../../components/ha-card";

import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig, LovelaceConfig } from "../../../../data/lovelace";
import { CardPickTarget, CardPickerConfig } from "../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  getCardElementClass,
  createCardElement,
} from "../../create-element/create-card-element";
import { computeDomain } from "../../../../common/entity/compute_domain";

import {
  computeUnusedEntities,
  computeUsedEntities,
  EXCLUDED_DOMAINS,
} from "../../common/compute-unused-entities";

const cardConfigs: CardPickerConfig[] = [
  {
    lovelaceConfig: { type: "alarm-panel" },
    includeDomains: ["alarm_control_panel"],
    name: "Alarm Panel",
  },
  {
    lovelaceConfig: { type: "entities" },
    numberOfEntities: 3,
    name: "Entities",
  },
  { lovelaceConfig: { type: "button" }, name: "Button" },
  {
    lovelaceConfig: { type: "conditional" },
    name: "Conditional",
    description: "Displays another card based on entity states.",
    noPreview: true,
  },
  {
    lovelaceConfig: { type: "entity-filter" },
    name: "Entity Filter",
    description:
      "This card allows you to define a list of entities that you want to track only when in a certain state.",
    noPreview: true,
  },
  {
    lovelaceConfig: { type: "gauge" },
    includeDomains: ["sensor"],
    name: "Gauge",
  },
  {
    lovelaceConfig: { type: "glance" },
    numberOfEntities: 3,
    name: "Glance",
  },
  {
    lovelaceConfig: { type: "history-graph" },
    includeDomains: ["sensor"],
    numberOfEntities: 2,
    name: "History Graph",
  },
  {
    lovelaceConfig: { type: "horizontal-stack" },
    name: "Horizontal Stack",
    description:
      "Horizontal stack card allows you to stack together multiple cards, so they always sit next to each other in the space of one column.",
    noPreview: true,
  },
  {
    lovelaceConfig: {
      type: "iframe",
      url: "https://www.home-assistant.io",
      aspect_ratio: "50%",
    },
    name: "iFrame",
    noEntity: true,
  },
  {
    lovelaceConfig: { type: "light" },
    includeDomains: ["light"],
    name: "Light",
  },
  {
    lovelaceConfig: { type: "map", default_zoom: 6 },
    includeDomains: ["device_tracker"],
    name: "Map",
    numberOfEntities: 1,
  },
  {
    lovelaceConfig: {
      type: "markdown",
      content:
        "The **Markdown** card allows you to write any text. You can style it **bold**, *italicized*, ~strikethrough~ etc. You can do images, links, and more. For more information see the [Markdown Cheatsheet](https://commonmark.org/help).",
    },
    name: "Markdown",
    noEntity: true,
  },
  {
    lovelaceConfig: { type: "media-control" },
    includeDomains: ["media_player"],
    name: "Media Control",
  },
  {
    lovelaceConfig: {
      type: "picture",
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
    },
    name: "Picture",
    noEntity: true,
  },
  {
    lovelaceConfig: {
      type: "picture-entity",
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
    },
    name: "Picture Entity",
  },
  {
    lovelaceConfig: {
      type: "picture-glance",
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
    },
    numberOfEntities: 2,
    name: "Picture Glance",
  },
  {
    lovelaceConfig: {
      type: "plant-status",
    },
    includeDomains: ["plant"],
    name: "Plant Status",
    description: "A card for all the lovely botanists out there.",
  },
  {
    lovelaceConfig: { type: "sensor", graph: "line" },
    includeDomains: ["sensor"],
    name: "Sensor",
  },
  {
    lovelaceConfig: { type: "shopping-list" },
    name: "Shopping List",
    description:
      "The Shopping List Card allows you to add, edit, check-off, and clear items from your shopping list.",
    noPreview: true,
  },
  {
    lovelaceConfig: { type: "thermostat" },
    includeDomains: ["climate"],
    name: "Thermostat",
  },
  {
    lovelaceConfig: { type: "weather-forecast" },
    includeDomains: ["weather"],
    name: "Weather Forecast",
  },
  {
    lovelaceConfig: { type: "vertical-stack" },
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
  public cardPicked?: (cardConf: LovelaceCardConfig) => void;

  protected render(): TemplateResult {
    return html`
      <h2>Main</h2>
      <div class="cards-container">
        ${cardConfigs
          .filter((cardConfig) => !cardConfig.noPreview)
          .map((cardConfig: CardPickerConfig) => {
            const lovelaceConfig = !cardConfig.noEntity
              ? this._getCardConfig(cardConfig)
              : cardConfig.lovelaceConfig;

            if (!lovelaceConfig) {
              cardConfig.noPreview = true;
              return html``;
            }

            const element = createCardElement(lovelaceConfig);
            element.hass = this.hass;

            return html`
              <div class="card">
                <ha-card .header=${cardConfig.name}>
                  <div class="preview">
                    <p class="preview-text">Preview:</p>
                    ${element}
                  </div>
                  <div class="options">
                    <div class="primary-actions">
                      <mwc-button
                        @click="${this._cardPicked}"
                        .type="${cardConfig.lovelaceConfig.type}"
                        >Select</mwc-button
                      >
                    </div>
                  </div>
                </ha-card>
              </div>
            `;
          })}
      </div>
      <h2>Other</h2>
      <div class="cards-container">
        ${cardConfigs
          .filter((cardConfig) => cardConfig.noPreview === true)
          .map((cardConfig: CardPickerConfig) => {
            return html`
              <div class="card">
                <ha-card .header=${cardConfig.name}>
                  <div>${cardConfig.description}</div>
                  <div class="options">
                    <div class="primary-actions">
                      <mwc-button
                        @click="${this._cardPicked}"
                        .type="${cardConfig.lovelaceConfig.type}"
                        >Select</mwc-button
                      >
                    </div>
                  </div>
                </ha-card>
              </div>
            `;
          })}
      </div>
      <h2>Manual</h2>
      <div class="cards-container">
        <div class="card">
          <ha-card .header=${"Manual"}>
            <div>
              Need to add a custom card or just want to manually write the yaml?
            </div>
            <div class="options">
              <div class="primary-actions">
                <mwc-button @click="${this._manualPicked}">Select</mwc-button>
              </div>
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

        .card > ha-card {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .card > ha-card > :first-child {
          pointer-events: none;
          margin: 0 20px;
        }

        div.options {
          border-top: 1px solid #e8e8e8;
          padding: 5px 8px;
          display: flex;
          margin-top: 8px;
        }

        div.options .primary-actions {
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

  private async _cardPicked(ev: Event): Promise<void> {
    const type = (ev.currentTarget! as CardPickTarget).type;

    const elClass = await getCardElementClass(type);
    let config: LovelaceCardConfig = { type };

    if (elClass && elClass.getStubConfig) {
      const cardConfig = elClass.getStubConfig(this.hass!);
      config = { ...config, ...cardConfig };
    }

    fireEvent(this, "config-changed", { config });
  }

  private _getCardConfig(
    cardConfig: CardPickerConfig
  ): LovelaceCardConfig | undefined {
    if (!this.hass) {
      return undefined;
    }

    let entityIds = computeUnusedEntities(this.hass, this.lovelace!);

    if (cardConfig.includeDomains && cardConfig.includeDomains.length) {
      entityIds = entityIds.filter((eid) =>
        cardConfig.includeDomains!.includes(computeDomain(eid))
      );
    }

    if (entityIds.length < (cardConfig.numberOfEntities || 1)) {
      let usedEntityIds = Object.keys([
        ...computeUsedEntities(this.lovelace),
      ]).filter((eid) => !EXCLUDED_DOMAINS.includes(eid)[0]);

      if (cardConfig.includeDomains && cardConfig.includeDomains.length) {
        usedEntityIds = usedEntityIds.filter((eid) =>
          cardConfig.includeDomains!.includes(computeDomain(eid))
        );
      }

      entityIds = [...entityIds, ...usedEntityIds];
    }

    if (!entityIds.length) {
      return undefined;
    }

    if (!cardConfig.numberOfEntities) {
      return {
        entity: entityIds[0],
        ...cardConfig.lovelaceConfig,
      };
    }

    return {
      entities: entityIds.slice(0, cardConfig.numberOfEntities),
      ...cardConfig.lovelaceConfig,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-picker": HuiCardPicker;
  }
}
