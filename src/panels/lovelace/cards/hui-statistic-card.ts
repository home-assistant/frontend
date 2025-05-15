import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-state-icon";
import { getEnergyDataCollection } from "../../../data/energy";
import type { StatisticsMetaData } from "../../../data/recorder";
import {
  fetchStatistic,
  getDisplayUnit,
  getStatisticLabel,
  getStatisticMetadata,
  isExternalStatistic,
} from "../../../data/recorder";
import type { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createHeaderFooterElement } from "../create-element/create-header-footer-element";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceHeaderFooter,
  LovelaceGridOptions,
} from "../types";
import type { HuiErrorCard } from "./hui-error-card";
import type { EntityCardConfig, StatisticCardConfig } from "./types";

export const PERIOD_ENERGY = "energy_date_selection";

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

  private _energySub?: UnsubscribeFunc;

  @state() private _energyStart?: Date;

  @state() private _energyEnd?: Date;

  private _interval?: number;

  private _footerElement?: HuiErrorCard | LovelaceHeaderFooter;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeEnergy();
    clearInterval(this._interval);
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this._config?.period === PERIOD_ENERGY) {
      this._subscribeEnergy();
    } else {
      this._setFetchStatisticTimer();
    }
  }

  private _subscribeEnergy() {
    if (!this._energySub) {
      this._energySub = getEnergyDataCollection(this.hass!, {
        key: this._config?.collection_key,
      }).subscribe((data) => {
        this._energyStart = data.start;
        this._energyEnd = data.end;
        this._fetchStatistic();
      });
    }
  }

  private _unsubscribeEnergy() {
    if (this._energySub) {
      this._energySub();
      this._energySub = undefined;
    }
    this._energyStart = undefined;
    this._energyEnd = undefined;
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
              .stateObj=${stateObj}
              .hass=${this.hass}
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
      changedProps.has("_error") ||
      changedProps.has("_energyStart") ||
      changedProps.has("_energyEnd")
    ) {
      return true;
    }
    if (this._config) {
      return hasConfigOrEntityChanged(this, changedProps);
    }
    return true;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this._config || !changedProps.has("_config")) {
      return;
    }
    const oldConfig = changedProps.get("_config") as
      | StatisticCardConfig
      | undefined;

    if (this.hass) {
      if (this._config.period === PERIOD_ENERGY && !this._energySub) {
        this._subscribeEnergy();
        return;
      }
      if (this._config.period !== PERIOD_ENERGY && this._energySub) {
        this._unsubscribeEnergy();
        this._setFetchStatisticTimer();
        return;
      }
      if (
        this._config.period === PERIOD_ENERGY &&
        this._energySub &&
        changedProps.has("_config") &&
        oldConfig?.collection_key !== this._config.collection_key
      ) {
        this._unsubscribeEnergy();
        this._subscribeEnergy();
      }
    }

    if (
      changedProps.has("_config") &&
      oldConfig?.entity !== this._config.entity
    ) {
      this._fetchMetadata().then(() => {
        this._setFetchStatisticTimer();
      });
    }
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

  private _setFetchStatisticTimer() {
    this._fetchStatistic();
    // statistics are created every hour
    clearInterval(this._interval);
    if (this._config?.period !== PERIOD_ENERGY) {
      this._interval = window.setInterval(
        () => this._fetchStatistic(),
        5 * 1000 * 60
      );
    }
  }

  private async _fetchStatistic() {
    if (!this.hass || !this._config) {
      return;
    }
    try {
      const stats = await fetchStatistic(
        this.hass,
        this._config.entity,
        this._energyStart && this._energyEnd
          ? { fixed_period: { start: this._energyStart, end: this._energyEnd } }
          : typeof this._config?.period === "object"
            ? this._config?.period
            : {}
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
          line-height: var(--ha-line-height-expanded);
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-statistic-card": HuiStatisticCard;
  }
}
