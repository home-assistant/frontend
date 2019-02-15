import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";
import { styleMap } from "lit-html/directives/style-map";
import "@material/mwc-ripple";

import "../../../components/ha-card";

import isValidEntityId from "../../../common/entity/valid_entity_id";
import stateIcon from "../../../common/entity/state_icon";
import computeStateDomain from "../../../common/entity/compute_state_domain";
import computeStateName from "../../../common/entity/compute_state_name";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";
import { HomeAssistant, LightEntity } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { longPress } from "../common/directives/long-press-directive";
import { handleClick } from "../common/handle-click";

export interface Config extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  theme?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

class HuiEntityButtonCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-entity-button-card-editor" */ "../editor/config-elements/hui-entity-button-card-editor");
    return document.createElement("hui-entity-button-card-editor");
  }

  public static getStubConfig(): object {
    return {
      tap_action: { action: "more-info" },
      hold_action: { action: "none" },
    };
  }

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
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass) {
      return (
        oldHass.states[this._config!.entity] !==
        this.hass!.states[this._config!.entity]
      );
    }
    return true;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }
    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <div class="not-found">
          Entity not available: ${this._config.entity}
        </div>
      `;
    }

    return html`
      <ha-card
        @ha-click="${this._handleTap}"
        @ha-hold="${this._handleHold}"
        .longPress="${longPress()}"
      >
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
        <mwc-ripple></mwc-ripple>
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.themes !== this.hass.themes) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 4% 0;
        font-size: 1.2rem;
      }
      ha-icon {
        width: 40%;
        height: auto;
        color: var(--paper-item-icon-color, #44739e);
      }
      ha-icon[data-domain="light"][data-state="on"],
      ha-icon[data-domain="switch"][data-state="on"],
      ha-icon[data-domain="binary_sensor"][data-state="on"],
      ha-icon[data-domain="fan"][data-state="on"],
      ha-icon[data-domain="sun"][data-state="above_horizon"] {
        color: var(--paper-item-icon-active-color, #fdd835);
      }
      ha-icon[data-state="unavailable"] {
        color: var(--state-icon-unavailable-color);
      }
      .not-found {
        flex: 1;
        background-color: yellow;
        padding: 8px;
      }
    `;
  }

  private _computeBrightness(stateObj: HassEntity | LightEntity): string {
    if (!stateObj.attributes.brightness) {
      return "";
    }
    const brightness = stateObj.attributes.brightness;
    return `brightness(${(brightness + 245) / 5}%)`;
  }

  private _computeColor(stateObj: HassEntity | LightEntity): string {
    if (!stateObj.attributes.hs_color) {
      return "";
    }
    const { hue, sat } = stateObj.attributes.hs_color;
    if (sat <= 10) {
      return "";
    }
    return `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
  }

  private _handleTap() {
    handleClick(this, this.hass!, this._config!, false);
  }

  private _handleHold() {
    handleClick(this, this.hass!, this._config!, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-button-card": HuiEntityButtonCard;
  }
}

customElements.define("hui-entity-button-card", HuiEntityButtonCard);
