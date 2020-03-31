import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateIcon } from "../../../common/entity/state_icon";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-warning";

import {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceHeaderFooter,
} from "../types";
import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { EntityCardConfig } from "./types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { actionHandler } from "../common/directives/action-handler-directive";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { findEntities } from "../common/find-entites";
import { createHeaderFooterElement } from "../create-element/create-header-footer-element";
import { UNKNOWN, UNAVAILABLE } from "../../../data/entity";
import { HuiErrorCard } from "./hui-error-card";

@customElement("hui-entity-card")
export class HuiEntityCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-entity-card-editor" */ "../editor/config-elements/hui-entity-card-editor"
    );
    return document.createElement("hui-entity-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFill: string[]
  ) {
    const includeDomains = ["sensor", "light", "switch"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFill,
      includeDomains
    );

    return {
      entity: foundEntities[0] || "",
    };
  }

  @property() public hass?: HomeAssistant;
  @property() private _config?: EntityCardConfig;
  private _footerElement?: HuiErrorCard | LovelaceHeaderFooter;

  public setConfig(config: EntityCardConfig): void {
    if (config.entity && !isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }

    this._config = config;

    if (this._config.footer) {
      this._footerElement = createHeaderFooterElement(this._config.footer);
    } else if (this._footerElement) {
      this._footerElement = undefined;
    }
  }

  public getCardSize(): number {
    return 1 + (this._config?.footer ? 1 : 0);
  }

  protected render(): TemplateResult {
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

    const showUnit = this._config.attribute
      ? this._config.attribute in stateObj.attributes
      : stateObj.state !== UNKNOWN && stateObj.state !== UNAVAILABLE;

    return html`
      <ha-card>
        <div
          @action=${this._handleClick}
          .actionHandler=${actionHandler()}
          tabindex="0"
        >
          <div class="header">
            <div class="name">
              ${this._config.name || computeStateName(stateObj)}
            </div>
            <div class="icon">
              <ha-icon
                .icon=${this._config.icon || stateIcon(stateObj)}
              ></ha-icon>
            </div>
          </div>
          <div class="info">
            <span class="value"
              >${"attribute" in this._config
                ? stateObj.attributes[this._config.attribute!] ||
                  this.hass.localize("state.default.unknown")
                : this.hass.localize(`state.default.${stateObj.state}`) ||
                  this.hass.localize(
                    `state.${this._config.entity.split(".")[0]}.${
                      stateObj.state
                    }`
                  ) ||
                  stateObj.state}</span
            >${showUnit
              ? html`
                  <span class="measurement"
                    >${this._config.unit ||
                      (this._config.attribute
                        ? ""
                        : stateObj.attributes.unit_of_measurement)}</span
                  >
                `
              : ""}
          </div>
        </div>
        ${this._footerElement}
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // Side Effect used to update footer hass while keeping optimizations
    if (this._footerElement) {
      this._footerElement.hass = this.hass;
    }

    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | EntityCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config!.theme);
    }
  }

  private _handleClick(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.entity });
  }

  static get styles(): CSSResult {
    return css`
      ha-card > div {
        cursor: pointer;
      }

      .header {
        display: flex;
        padding: 8px 16px 0;
        justify-content: space-between;
      }

      .name {
        color: var(--secondary-text-color);
        line-height: 40px;
        font-weight: 500;
        font-size: 16px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .icon {
        color: var(--state-icon-color, #44739e);
        line-height: 40px;
      }

      .info {
        padding: 0px 16px 16px;
        margin-top: -4px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .value {
        font-size: 28px;
        margin-right: 4px;
      }

      .measurement {
        font-size: 18px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-card": HuiEntityCard;
  }
}
