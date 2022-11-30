import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateActive } from "../../../common/entity/state_active";
import { stateColor } from "../../../common/entity/state_color";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import {
  formatNumber,
  getNumberFormatOptions,
  isNumericState,
} from "../../../common/number/format_number";
import { iconColorCSS } from "../../../common/style/icon_color_css";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import { formatAttributeValue } from "../../../data/entity_attributes";
import { LightEntity } from "../../../data/light";
import { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { createHeaderFooterElement } from "../create-element/create-header-footer-element";
import {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceHeaderFooter,
} from "../types";
import { HuiErrorCard } from "./hui-error-card";
import { EntityCardConfig } from "./types";

@customElement("hui-entity-card")
export class HuiEntityCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-entity-card-editor");
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

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityCardConfig;

  private _footerElement?: HuiErrorCard | LovelaceHeaderFooter;

  public setConfig(config: EntityCardConfig): void {
    if (!config.entity) {
      throw new Error("Entity must be specified");
    }
    if (config.entity && !isValidEntityId(config.entity)) {
      throw new Error("Invalid entity");
    }

    this._config = config;

    if (this._config.footer) {
      this._footerElement = createHeaderFooterElement(this._config.footer);
    } else if (this._footerElement) {
      this._footerElement = undefined;
    }
  }

  public async getCardSize(): Promise<number> {
    let size = 2;
    if (this._footerElement) {
      const footerSize = computeCardSize(this._footerElement);
      size += footerSize instanceof Promise ? await footerSize : footerSize;
    }
    return size;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const domain = computeStateDomain(stateObj);
    const showUnit = this._config.attribute
      ? this._config.attribute in stateObj.attributes
      : !UNAVAILABLE_STATES.includes(stateObj.state);

    const name = this._config.name || computeStateName(stateObj);

    const active =
      (this._config.state_color ||
        (domain === "light" && this._config.state_color !== false)) &&
      stateActive(stateObj);

    return html`
      <ha-card @click=${this._handleClick} tabindex="0">
        <div class="header">
          <div class="name" .title=${name}>${name}</div>
          <div class="icon">
            <ha-state-icon
              .icon=${this._config.icon}
              .state=${stateObj}
              ?data-active=${active}
              data-domain=${ifDefined(domain)}
              data-state=${stateObj.state}
              style=${styleMap({
                color: active ? this._computeColor(stateObj) : "",
                height: this._config.icon_height
                  ? this._config.icon_height
                  : "",
              })}
            ></ha-state-icon>
          </div>
        </div>
        <div class="info">
          <span class="value"
            >${"attribute" in this._config
              ? stateObj.attributes[this._config.attribute!] !== undefined
                ? formatAttributeValue(
                    this.hass,
                    stateObj.attributes[this._config.attribute!]
                  )
                : this.hass.localize("state.default.unknown")
              : isNumericState(stateObj) || this._config.unit
              ? formatNumber(
                  stateObj.state,
                  this.hass.locale,
                  getNumberFormatOptions(stateObj)
                )
              : computeStateDisplay(
                  this.hass.localize,
                  stateObj,
                  this.hass.locale
                )}</span
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
        ${this._footerElement}
      </ha-card>
    `;
  }

  private _computeColor(stateObj: HassEntity | LightEntity): string {
    const domain = computeStateDomain(stateObj);
    if (
      !(
        this._config?.state_color ||
        (domain === "light" && this._config?.state_color !== false)
      ) ||
      !stateActive(stateObj)
    ) {
      return "";
    }
    const iconColor = stateColor(stateObj);
    if (iconColor) {
      return `rgb(var(--rgb-state-${iconColor}-color))`;
    }
    return "";
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

  static get styles(): CSSResultGroup {
    return [
      iconColorCSS,
      css`
        ha-card {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          outline: none;
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
          line-height: 28px;
        }

        .value {
          font-size: 28px;
          margin-right: 4px;
        }

        .measurement {
          font-size: 18px;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-card": HuiEntityCard;
  }
}
