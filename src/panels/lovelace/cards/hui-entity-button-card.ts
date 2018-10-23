import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { fireEvent } from "../../../common/dom/fire_event.js";

import "../../../components/ha-card.js";

import toggleEntity from "../common/entity/toggle-entity.js";
import isValidEntityId from "../../../common/entity/valid_entity_id.js";
import stateIcon from "../../../common/entity/state_icon.js";
import computeStateDomain from "../../../common/entity/compute_state_domain.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element.js";
import { styleMap } from "lit-html/directives/styleMap.js";
import { HomeAssistant } from "../../../types.js";
import { HassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard, LovelaceConfig } from "../types.js";

interface Config extends LovelaceConfig {
  entity: string;
  name?: string;
  icon?: string;
  theme?: string;
  tap_action?: "toggle" | "call-service" | "more-info";
  service?: string;
  service_data?: object;
}

class HuiEntityButtonCard extends HassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  protected config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      config: {},
    };
  }

  public getCardSize() {
    return 2;
  }

  public setConfig(config: Config) {
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }

    this.config = { theme: "default", ...config };

    if (this.hass) {
      this.requestUpdate();
    }
  }

  protected render() {
    if (!this.config) {
      return html``;
    }
    const stateObj = this.hass!.states[this.config.entity];

    applyThemesOnElement(this, this.hass!.themes, this.config.theme);

    return html`
      ${this.renderStyle()}
      <ha-card @click="${this.handleClick}">
        ${
          !stateObj
            ? html`<div class="not-found">Entity not available: ${
                this.config.entity
              }</div>`
            : html`
              <paper-button>
                <div>
                  <ha-icon
                    data-domain="${computeStateDomain(stateObj)}"
                    data-state="${stateObj.state}"
                    .icon="${
                      this.config.icon ? this.config.icon : stateIcon(stateObj)
                    }"
                    style="${styleMap({
                      filter: this._computeBrightness(stateObj),
                      color: this._computeColor(stateObj),
                    })}"
                  ></ha-icon>
                  <span>
                    ${
                      this.config.name
                        ? this.config.name
                        : computeStateName(stateObj)
                    }
                  </span>
                </div>
              </paper-button>
            `
        }
      </ha-card>
    `;
  }

  private renderStyle() {
    return html`
    <style>
      ha-icon {
        display: flex;
        margin: auto;
        width: 40%;
        height: 40%;
        color: var(--paper-item-icon-color, #44739e);
      }
      ha-icon[data-domain=light][data-state=on],
      ha-icon[data-domain=switch][data-state=on],
      ha-icon[data-domain=binary_sensor][data-state=on],
      ha-icon[data-domain=fan][data-state=on],
      ha-icon[data-domain=sun][data-state=above_horizon] {
        color: var(--paper-item-icon-active-color, #FDD835);
      }
      ha-icon[data-state=unavailable] {
        color: var(--state-icon-unavailable-color);
      }
      state-badge {
        display: flex;
        margin: auto;
        width:40%;
        height:40%;
      }
      paper-button {
        display: flex;
        margin: auto;
        text-align: center;
      }
      .not-found {
        flex: 1;
        background-color: yellow;
        padding: 8px;
      }
    </style>
    `;
  }

  private _computeBrightness(stateObj) {
    if (!stateObj.attributes.brightness) {
      return "";
    }
    const brightness = stateObj.attributes.brightness;
    return `brightness(${(brightness + 245) / 5}%)`;
  }

  private _computeColor(stateObj) {
    if (!stateObj.attributes.hs_color) {
      return "";
    }
    const hue = stateObj.attributes.hs_color[0];
    const sat = stateObj.attributes.hs_color[1];
    if (sat <= 10) {
      return "";
    }
    return `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
  }

  private handleClick() {
    const config = this.config;
    if (!config) {
      return;
    }
    const stateObj = this.hass!.states[config.entity];
    if (!stateObj) {
      return;
    }
    const entityId = stateObj.entity_id;
    switch (config.tap_action) {
      case "toggle":
        toggleEntity(this.hass, entityId);
        break;
      case "call-service": {
        if (!config.service) {
          return;
        }
        const [domain, service] = config.service.split(".", 2);
        const serviceData = { entity_id: entityId, ...config.service_data };
        this.hass!.callService(domain, service, serviceData);
        break;
      }
      default:
        fireEvent(this, "hass-more-info", { entityId });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-button-card": HuiEntityButtonCard;
  }
}

customElements.define("hui-entity-button-card", HuiEntityButtonCard);
