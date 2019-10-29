import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
  customElement,
  property,
} from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";
import { styleMap } from "lit-html/directives/style-map";
import "@material/mwc-ripple";

import "../../../components/ha-card";
import "../components/hui-warning";

import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { stateIcon } from "../../../common/entity/state_icon";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";

import { HomeAssistant, LightEntity } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { EntityButtonCardConfig } from "./types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { handleAction } from "../common/handle-action";
import { ActionHandlerEvent } from "../../../data/lovelace";

@customElement("hui-entity-button-card")
class HuiEntityButtonCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-entity-button-card-editor" */ "../editor/config-elements/hui-entity-button-card-editor");
    return document.createElement("hui-entity-button-card-editor");
  }

  public static getStubConfig(): object {
    return {
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      show_icon: true,
      show_name: true,
    };
  }

  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityButtonCardConfig;

  public getCardSize(): number {
    return 2;
  }

  public setConfig(config: EntityButtonCardConfig): void {
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }

    this._config = {
      theme: "default",
      hold_action: { action: "more-info" },
      double_tap_action: { action: "none" },
      show_icon: true,
      show_name: true,
      ...config,
    };

    if (DOMAINS_TOGGLE.has(computeDomain(config.entity))) {
      this._config = {
        tap_action: {
          action: "toggle",
        },
        ...this._config,
      };
    } else {
      this._config = {
        tap_action: {
          action: "more-info",
        },
        ...this._config,
      };
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !oldHass ||
      oldHass.themes !== this.hass!.themes ||
      oldHass.language !== this.hass!.language
    ) {
      return true;
    }

    return (
      oldHass.states[this._config!.entity] !==
      this.hass!.states[this._config!.entity]
    );
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }
    const stateObj = this.hass.states[this._config.entity];

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
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
      >
        ${this._config.show_icon
          ? html`
              <ha-icon
                data-domain="${computeStateDomain(stateObj)}"
                data-state="${stateObj.state}"
                .icon="${this._config.icon || stateIcon(stateObj)}"
                style="${styleMap({
                  filter: this._computeBrightness(stateObj),
                  color: this._computeColor(stateObj),
                  height: this._config.icon_height
                    ? this._config.icon_height
                    : "auto",
                })}"
              ></ha-icon>
            `
          : ""}
        ${this._config.show_name
          ? html`
              <span>
                ${this._config.name || computeStateName(stateObj)}
              </span>
            `
          : ""}
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
    const oldConfig = changedProps.get("_config") as
      | EntityButtonCardConfig
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
    const [hue, sat] = stateObj.attributes.hs_color;
    if (sat <= 10) {
      return "";
    }
    return `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-button-card": HuiEntityButtonCard;
  }
}
