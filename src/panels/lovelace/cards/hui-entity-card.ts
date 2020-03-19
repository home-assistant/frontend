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

import { LovelaceCard, LovelaceCardEditor } from "../types";
import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { EntityCardConfig } from "./types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { actionHandler } from "../common/directives/action-handler-directive";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { LovelaceConfig } from "../../../data/lovelace";
import { findEntities } from "../common/find-entites";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";
import { createHeaderFooterElement } from "../create-element/create-header-footer-element";

@customElement("hui-entity-card")
class HuiEntityCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-entity-card-editor" */ "../editor/config-elements/hui-entity-card-editor"
    );
    return document.createElement("hui-entity-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    lovelaceConfig: LovelaceConfig,
    entities?: string[],
    entitiesFill?: string[]
  ) {
    const includeDomains = ["sensor", "light", "switch"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      lovelaceConfig,
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

  public setConfig(config: EntityCardConfig): void {
    if (config.entity && !isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }

    this._config = config;
  }

  public getCardSize(): number {
    return 2;
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

    if (
      this._config.attribute &&
      !stateObj.attributes[this._config.attribute]
    ) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.attribute_not_found",
            "attribute",
            this._config.attribute
          )}</hui-warning
        >
      `;
    }

    return html`
      <ha-card
        @action=${this._handleClick}
        .actionHandler=${actionHandler()}
        tabindex="0"
      >
        <div class="flex header">
          <div class="name">
            <span>${this._config.name || computeStateName(stateObj)}</span>
          </div>
          <div class="icon">
            <ha-icon
              .icon="${this._config.icon || stateIcon(stateObj)}"
            ></ha-icon>
          </div>
        </div>
        <div class="flex info">
          <span id="value"
            >${this._config.attribute
              ? stateObj.attributes[this._config.attribute]
              : stateObj.state}</span
          >
          <span id="measurement"
            >${this._config.unit ||
              stateObj.attributes.unit_of_measurement}</span
          >
        </div>
        ${this._config.footer
          ? this.renderHeaderFooter(this._config.footer, "footer")
          : ""}
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
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

  private renderHeaderFooter(
    conf: LovelaceHeaderFooterConfig,
    className: string
  ): TemplateResult {
    const element = createHeaderFooterElement(conf);
    if (this.hass) {
      element.hass = this.hass;
    }
    return html`
      <div class=${"header-footer " + className}>${element}</div>
    `;
  }

  private _handleClick(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.entity });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        flex-direction: column;
      }

      ha-card {
        display: flex;
        flex-direction: column;
        flex: 1;
        position: relative;
        cursor: pointer;
        overflow: hidden;
      }

      ha-card:focus {
        outline: none;
        background: var(--divider-color);
      }

      .flex {
        display: flex;
      }

      .header {
        margin: 8px 16px 0;
        justify-content: space-between;
      }

      .name {
        align-items: center;
        display: flex;
        min-width: 0;
        opacity: 0.8;
        position: relative;
      }

      .name > span {
        display: block;
        display: -webkit-box;
        font-size: 1.2rem;
        font-weight: 500;
        max-height: 1.4rem;
        top: 2px;
        opacity: 0.8;
        overflow: hidden;
        text-overflow: ellipsis;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        word-wrap: break-word;
        word-break: break-all;
      }

      .icon {
        color: var(--paper-item-icon-color, #44739e);
        line-height: 40px;
      }

      .info {
        flex-wrap: wrap;
        margin: 0 16px 16px;
      }

      #value {
        display: inline-block;
        font-size: 2rem;
        font-weight: 400;
        line-height: 1em;
        margin-right: 4px;
      }

      #measurement {
        align-self: flex-end;
        display: inline-block;
        font-size: 1.3rem;
        line-height: 1.2em;
        margin-top: 0.1em;
        opacity: 0.6;
        vertical-align: bottom;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-card": HuiEntityCard;
  }
}
