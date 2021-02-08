import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { PlantAttributeTarget, PlantStatusCardConfig } from "./types";

const SENSORS = {
  moisture: "hass:water",
  temperature: "hass:thermometer",
  brightness: "hass:white-balance-sunny",
  conductivity: "hass:emoticon-poop",
  battery: "hass:battery",
};

@customElement("hui-plant-status-card")
class HuiPlantStatusCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-plant-status-card-editor");
    return document.createElement("hui-plant-status-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): PlantStatusCardConfig {
    const includeDomains = ["plant"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "plant-status", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: PlantStatusCardConfig;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PlantStatusCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "plant") {
      throw new Error("Specify an entity from within the plant domain");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | PlantStatusCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config!.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <ha-card
        class="${stateObj.attributes.entity_picture ? "has-plant-image" : ""}"
      >
        <div
          class="banner"
          style="background-image:url(${stateObj.attributes.entity_picture})"
        >
          <div class="header">
            ${this._config.name || computeStateName(stateObj)}
          </div>
        </div>
        <div class="content">
          ${this.computeAttributes(stateObj).map(
            (item) => html`
              <div
                class="attributes"
                @action=${this._handleMoreInfo}
                .actionHandler=${actionHandler()}
                tabindex="0"
                .value="${item}"
              >
                <div>
                  <ha-icon
                    icon="${this.computeIcon(
                      item,
                      stateObj.attributes.battery
                    )}"
                  ></ha-icon>
                </div>
                <div
                  class="${stateObj.attributes.problem.indexOf(item) === -1
                    ? ""
                    : "problem"}"
                >
                  ${stateObj.attributes[item]}
                </div>
                <div class="uom">
                  ${stateObj.attributes.unit_of_measurement_dict[item] || ""}
                </div>
              </div>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        height: 100%;
        box-sizing: border-box;
      }
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
        /* start paper-font-headline style */
        font-family: "Roboto", "Noto", sans-serif;
        -webkit-font-smoothing: antialiased; /* OS X subpixel AA bleed bug */
        text-rendering: optimizeLegibility;
        font-size: 24px;
        font-weight: 400;
        letter-spacing: -0.012em;
        /* end paper-font-headline style */

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

      .attributes:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 100%;
      }

      .attributes div {
        text-align: center;
      }

      .problem {
        color: var(--error-color);
        font-weight: bold;
      }

      .uom {
        color: var(--secondary-text-color);
      }
    `;
  }

  private computeAttributes(stateObj: HassEntity): string[] {
    return Object.keys(SENSORS).filter((key) => key in stateObj.attributes);
  }

  private computeIcon(attr: string, batLvl: number): string {
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

  private _handleMoreInfo(ev: Event): void {
    const target = ev.currentTarget! as PlantAttributeTarget;
    const stateObj = this.hass!.states[this._config!.entity];

    if (target.value) {
      fireEvent(this, "hass-more-info", {
        entityId: stateObj.attributes.sensors[target.value],
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-plant-status-card": HuiPlantStatusCard;
  }
}
