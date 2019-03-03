import {
  html,
  LitElement,
  TemplateResult,
  css,
  CSSResult,
  property,
  customElement,
} from "lit-element";

import "../../../components/ha-card";
import "../../../components/ha-icon";

import computeStateName from "../../../common/entity/compute_state_name";

import { LovelaceCardEditor, LovelaceCard } from "../types";
import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { repeat } from "lit-html/directives/repeat";

const SENSORS = {
  moisture: "hass:water",
  temperature: "hass:thermometer",
  brightness: "hass:white-balance-sunny",
  conductivity: "hass:emoticon-poop",
  battery: "hass:battery",
};

export interface PlantSensor {}

export interface PlantStatusConfig extends LovelaceCardConfig {
  name?: string;
  entity: string;
}

@customElement("hui-plant-status-card")
class HuiPlantStatusCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-plant-status-card-editor" */ "../editor/config-elements/hui-plant-status-card-editor");
    return document.createElement("hui-plant-status-card-editor");
  }

  public static getStubConfig(): object {
    return {};
  }

  @property() public hass?: HomeAssistant;

  @property() private _config?: PlantStatusConfig;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PlantStatusConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "plant") {
      throw new Error("Specify an entity from within the plant domain.");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config!.entity];

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    return html`
      <ha-card
        class$="[[computeImageClass(stateObj.attributes.entity_picture)]]"
      >
        <div
          class="banner"
          style="background-image:url([[stateObj.attributes.entity_picture]])"
        >
          <div class="header">
            ${this._config.title || computeStateName(stateObj)}
          </div>
        </div>
        <div class="content">
          ${repeat(
            this.computeAttributes(stateObj),
            (item) => item.id,
            (item, index) => html``
          )}
          <template
            is="dom-repeat"
            items="[[computeAttributes(stateObj.attributes)]]"
          >
            <div class="attributes" on-click="attributeClicked">
              <div>
                <ha-icon
                  icon="[[computeIcon(item, stateObj.attributes.battery)]]"
                ></ha-icon>
              </div>
              <div
                class$="[[computeAttributeClass(stateObj.attributes.problem, item)]]"
              >
                [[computeValue(stateObj.attributes, item)]]
              </div>
              <div class="uom">
                [[computeUom(stateObj.attributes.unit_of_measurement_dict,
                item)]]
              </div>
            </div>
          </template>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .banner {
        display: flex;
        align-items: flex-end;
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
        padding-top: 12px;
      }

      .has-plant-image .banner {
        padding-top: 30%;
      }

      .header {
        @apply --paper-font-headline;
        line-height: 40px;
        padding: 8px 16px;
      }

      .has-plant-image .header {
        font-size: 16px;
        font-weight: 500;
        line-height: 16px;
        padding: 16px;
        color: white;
        width: 100%;
        background: rgba(0, 0, 0, var(--dark-secondary-opacity));
      }

      .content {
        display: flex;
        justify-content: space-between;
        padding: 16px 32px 24px 32px;
      }

      .has-plant-image .content {
        padding-bottom: 16px;
      }

      ha-icon {
        color: var(--paper-item-icon-color);
        margin-bottom: 8px;
      }

      .attributes {
        cursor: pointer;
      }

      .attributes div {
        text-align: center;
      }

      .problem {
        color: var(--google-red-500);
        font-weight: bold;
      }

      .uom {
        color: var(--secondary-text-color);
      }
    `;
  }

  private computeTitle(stateObj) {
    return (this._config && this._config.title) || computeStateName(stateObj);
  }

  private computeAttributes(data) {
    return Object.keys(SENSORS).filter((key) => key in data);
  }

  private computeIcon(attr, batLvl) {
    const icon = SENSORS[attr];
    if (attr === "battery") {
      if (batLvl <= 5) {
        return `${icon}-alert`;
      }
      if (batLvl < 95) {
        return `${icon}-${Math.round(batLvl / 10 - 0.01) * 10}`;
      }
    }
    return icon;
  }

  private computeValue(attributes, attr) {
    return attributes[attr];
  }

  private computeUom(dict, attr) {
    return dict[attr] || "";
  }

  private computeAttributeClass(problem, attr) {
    return problem.indexOf(attr) === -1 ? "" : "problem";
  }

  private computeImageClass(entityPicture) {
    return entityPicture ? "has-plant-image" : "";
  }

  private attributeClicked(ev) {
    this.fire("hass-more-info", {
      entityId: this.stateObj.attributes.sensors[ev.model.item],
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-plant-status-card": HuiPlantStatusCard;
  }
}
