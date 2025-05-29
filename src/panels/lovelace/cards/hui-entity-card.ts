import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  stateColorBrightness,
  stateColorCss,
} from "../../../common/entity/state_color";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import {
  formatNumber,
  getNumberFormatOptions,
  isNumericState,
} from "../../../common/number/format_number";
import { iconColorCSS } from "../../../common/style/icon_color_css";
import "../../../components/ha-attribute-value";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import { CLIMATE_HVAC_ACTION_TO_MODE } from "../../../data/climate";
import { isUnavailableState } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { createHeaderFooterElement } from "../create-element/create-header-footer-element";
import type {
  LovelaceCard,
  LovelaceGridOptions,
  LovelaceHeaderFooter,
} from "../types";
import type { HuiErrorCard } from "./hui-error-card";
import type { EntityCardConfig } from "./types";

@customElement("hui-entity-card")
export class HuiEntityCard extends LitElement implements LovelaceCard {
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

  public static async getConfigForm() {
    return (await import("../editor/config-elements/hui-entity-card-editor"))
      .default;
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public layout?: string;

  @state() private _config?: EntityCardConfig;

  private _footerElement?: HuiErrorCard | LovelaceHeaderFooter;

  private _getStateColor(stateObj: HassEntity, config: EntityCardConfig) {
    const domain = stateObj ? computeStateDomain(stateObj) : undefined;
    return config && (config.state_color ?? domain === "light");
  }

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

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const domain = computeStateDomain(stateObj);
    const showUnit = this._config.attribute
      ? this._config.attribute in stateObj.attributes
      : !isUnavailableState(stateObj.state);

    const name = this._config.name || computeStateName(stateObj);

    const colored = stateObj && this._getStateColor(stateObj, this._config);

    const fixedFooter =
      this.layout === "grid" && this._footerElement !== undefined;

    return html`
      <ha-card
        @click=${this._handleClick}
        tabindex="0"
        class=${classMap({ "with-fixed-footer": fixedFooter })}
      >
        <div class="header">
          <div class="name" .title=${name}>${name}</div>
          <div class="icon">
            <ha-state-icon
              .icon=${this._config.icon}
              .stateObj=${stateObj}
              .hass=${this.hass}
              data-domain=${ifDefined(domain)}
              data-state=${stateObj.state}
              style=${styleMap({
                color: colored ? this._computeColor(stateObj) : undefined,
                filter: colored ? stateColorBrightness(stateObj) : undefined,
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
                ? html`
                    <ha-attribute-value
                      hide-unit
                      .hass=${this.hass}
                      .stateObj=${stateObj}
                      .attribute=${this._config.attribute!}
                    >
                    </ha-attribute-value>
                  `
                : this.hass.localize("state.default.unknown")
              : (isNumericState(stateObj) || this._config.unit) &&
                  stateObj.attributes.device_class !== "duration"
                ? formatNumber(
                    stateObj.state,
                    this.hass.locale,
                    getNumberFormatOptions(
                      stateObj,
                      this.hass.entities[this._config.entity]
                    )
                  )
                : this.hass.formatEntityState(stateObj)}</span
          >${showUnit
            ? html`
                <span class="measurement"
                  >${this._config.unit ||
                  (this._config.attribute ||
                  stateObj.attributes.device_class === "duration"
                    ? ""
                    : stateObj.attributes.unit_of_measurement)}</span
                >
              `
            : ""}
        </div>
        <div class="footer">${this._footerElement}</div>
      </ha-card>
    `;
  }

  private _computeColor(stateObj: HassEntity): string | undefined {
    if (stateObj.attributes.hvac_action) {
      const hvacAction = stateObj.attributes.hvac_action;
      if (hvacAction in CLIMATE_HVAC_ACTION_TO_MODE) {
        return stateColorCss(stateObj, CLIMATE_HVAC_ACTION_TO_MODE[hvacAction]);
      }
      return undefined;
    }
    if (stateObj.attributes.rgb_color) {
      return `rgb(${stateObj.attributes.rgb_color.join(",")})`;
    }
    const iconColor = stateColorCss(stateObj);
    if (iconColor) {
      return iconColor;
    }
    return undefined;
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

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 6,
      rows: 2,
      min_columns: 6,
      min_rows: 2,
    };
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
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .icon {
          color: var(--state-icon-color);
          --state-inactive-color: var(--state-icon-color);
          line-height: 40px;
        }

        .info {
          padding: 0px 16px 16px;
          margin-top: -4px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          line-height: var(--ha-line-height-expanded);
        }

        .value {
          font-size: var(--ha-font-size-3xl);
          margin-right: 4px;
          margin-inline-end: 4px;
          margin-inline-start: initial;
        }

        .measurement {
          font-size: var(--ha-font-size-l);
          color: var(--secondary-text-color);
        }

        .with-fixed-footer {
          justify-content: flex-start;
        }
        .with-fixed-footer .footer {
          position: absolute;
          right: 0;
          left: 0;
          bottom: 0;
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
