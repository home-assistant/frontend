import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
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
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard, LovelaceConfig } from "../types.js";
import { longPress } from "../common/directives/long-press-directive";
import { TemplateResult } from "lit-html";

interface Config extends LovelaceConfig {
  entity: string;
  name?: string;
  icon?: string;
  theme?: string;
  tap_action?: "toggle" | "call-service" | "more-info";
  hold_action?: "toggle" | "call-service" | "more-info";
  service?: string;
  service_data?: object;
}

class HuiEntityButtonCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public getCardSize(): number {
    return 2;
  }

  public setConfig(config: Config): void {
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }

    this._config = { theme: "default", ...config };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.get("hass")) {
      return (
        (changedProps.get("hass") as any).states[this._config!.entity] !==
        this.hass!.states[this._config!.entity]
      );
    }
    return (changedProps as unknown) as boolean;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }
    const stateObj = this.hass!.states[this._config.entity];

    return html`
      ${this.renderStyle()}
      <ha-card
        @ha-click="${() => this.handleClick(false)}"
        @ha-hold="${() => this.handleClick(true)}"
        .longPress="${longPress()}"
      >
        ${
          !stateObj
            ? html`<div class="not-found">Entity not available: ${
                this._config.entity
              }</div>`
            : html`
              <paper-button>
                <div>
                  <ha-icon
                    data-domain="${computeStateDomain(stateObj)}"
                    data-state="${stateObj.state}"
                    .icon="${this._config.icon || stateIcon(stateObj)}"
                    style="${styleMap({
                      filter: this._computeBrightness(stateObj),
                      color: this._computeColor(stateObj),
                    })}"
                  ></ha-icon>
                  <span>
                    ${this._config.name || computeStateName(stateObj)}
                  </span>
                </div>
              </paper-button>
            `
        }
      </ha-card>
    `;
  }

  protected updated(_changedProperties: PropertyValues): void {
    if (this.hass && this._config) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private renderStyle(): TemplateResult {
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

  private _computeBrightness(stateObj: any): string {
    if (!stateObj.attributes.brightness) {
      return "";
    }
    const brightness = stateObj.attributes.brightness;
    return `brightness(${(brightness + 245) / 5}%)`;
  }

  private _computeColor(stateObj: any): string {
    if (!stateObj.attributes.hs_color) {
      return "";
    }
    const { hue, sat } = stateObj.attributes.hs_color;
    if (sat <= 10) {
      return "";
    }
    return `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
  }

  private handleClick(hold: boolean): void {
    const config = this._config;
    if (!config) {
      return;
    }
    const stateObj = this.hass!.states[config.entity];
    if (!stateObj) {
      return;
    }
    const entityId = stateObj.entity_id;
    const action = hold ? config.hold_action : config.tap_action || "more-info";
    switch (action) {
      case "toggle":
        toggleEntity(this.hass, entityId);
        break;
      case "call-service":
        if (!config.service) {
          return;
        }
        const [domain, service] = config.service.split(".", 2);
        const serviceData = { entity_id: entityId, ...config.service_data };
        this.hass!.callService(domain, service, serviceData);
        break;
      case "more-info":
        fireEvent(this, "hass-more-info", { entityId });
        break;
      default:
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-button-card": HuiEntityButtonCard;
  }
}

customElements.define("hui-entity-button-card", HuiEntityButtonCard);
