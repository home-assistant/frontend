import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-state-icon";
import {
  fetchStatistic,
  getDisplayUnit,
  getStatisticLabel,
  getStatisticMetadata,
  isExternalStatistic,
  StatisticsMetaData,
} from "../../../data/recorder";
import { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createHeaderFooterElement } from "../create-element/create-header-footer-element";
import {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceHeaderFooter,
} from "../types";
import { HuiErrorCard } from "./hui-error-card";
import { EntityCardConfig, StatisticCardConfig } from "./types";

@customElement("hui-statistic-card")
export class HuiStatisticCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-statistic-card-editor");
    return document.createElement("hui-statistic-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFill: string[]
  ) {
    const includeDomains = ["sensor"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFill,
      includeDomains,
      (stateObj: HassEntity) => "state_class" in stateObj.attributes
    );

    return {
      entity: foundEntities[0] || "",
      period: { calendar: { period: "month" } },
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StatisticCardConfig;

  @state() private _value?: number | null;

  @state() private _metadata?: StatisticsMetaData;

  @state() private _error?: string;

  private _interval?: number;

  private _footerElement?: HuiErrorCard | LovelaceHeaderFooter;

  public disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._interval);
  }

  public setConfig(config: StatisticCardConfig): void {
    if (!config.entity) {
      throw new Error("Entity must be specified");
    }
    if (!config.stat_type) {
      throw new Error("Statistic type must be specified");
    }
    if (!config.period) {
      throw new Error("Period must be specified");
    }
    if (
      config.entity &&
      !isExternalStatistic(config.entity) &&
      !isValidEntityId(config.entity)
    ) {
      throw new Error("Invalid entity");
    }

    this._config = config;
    this._error = undefined;
    this._fetchStatistic();
    this._fetchMetadata();

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

    if (this._error) {
      return html` <ha-alert alert-type="error">${this._error}</ha-alert> `;
    }

    const stateObj = this.hass.states[this._config.entity];
    const name =
      this._config.name ||
      getStatisticLabel(this.hass, this._config.entity, this._metadata);

    return html`
      <ha-card @click=${this._handleClick} tabindex="0">
        <div class="header">
          <div class="name" .title=${name}>${name}</div>
          <div class="icon">
            <ha-state-icon
              .icon=${this._config.icon}
              .state=${stateObj}
            ></ha-state-icon>
          </div>
        </div>
        <div class="info">
          <span class="value"
            >${this._value === undefined
              ? ""
              : this._value === null
              ? "?"
              : formatNumber(this._value, this.hass.locale)}</span
          >
          <span class="measurement"
            >${this._config.unit ||
            getDisplayUnit(
              this.hass,
              this._config.entity,
              this._metadata
            )}</span
          >
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
    if (
      changedProps.has("_value") ||
      changedProps.has("_metadata") ||
      changedProps.has("_error")
    ) {
      return true;
    }
    if (this._config) {
      return hasConfigOrEntityChanged(this, changedProps);
    }
    return true;
  }

  protected firstUpdated() {
    this._fetchStatistic();
    this._fetchMetadata();
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

  private async _fetchStatistic() {
    if (!this.hass || !this._config) {
      return;
    }
    clearInterval(this._interval);
    this._interval = window.setInterval(
      () => this._fetchStatistic(),
      5 * 1000 * 60
    );
    try {
      const stats = await fetchStatistic(
        this.hass,
        this._config.entity,
        this._config.period
      );
      this._value = stats[this._config!.stat_type];
      this._error = undefined;
    } catch (e: any) {
      this._error = e.message;
    }
  }

  private async _fetchMetadata() {
    if (!this.hass || !this._config) {
      return;
    }
    try {
      this._metadata = (
        await getStatisticMetadata(this.hass, [this._config.entity])
      )?.[0];
    } catch (e: any) {
      this._error = e.message;
    }
  }

  private _handleClick(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.entity });
  }

  static get styles(): CSSResultGroup {
    return [
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
    "hui-statistic-card": HuiStatisticCard;
  }
}
