import { mdiChartBox, mdiChevronDown, mdiChevronUp } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { getGraphColorByIndex } from "../../../common/color/colors";
import { computeDomain } from "../../../common/entity/compute_domain";
import { MobileAwareMixin } from "../../../mixins/mobile-aware-mixin";
import type { EntityNameItem } from "../../../common/entity/compute_entity_name_display";
import { computeLovelaceEntityName } from "../common/entity/compute-lovelace-entity-name";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-card";
import "../../../components/ha-segmented-bar";
import type { Segment } from "../../../components/ha-segmented-bar";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { processConfigEntities } from "../common/process-config-entities";
import { findEntities } from "../common/find-entities";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import type { DistributionCardConfig, DistributionEntityConfig } from "./types";

const LEGEND_OVERFLOW_LIMIT = 10;
const LEGEND_OVERFLOW_LIMIT_MOBILE = 6;

interface ProcessedEntity {
  entity: string;
  name?: string | EntityNameItem | EntityNameItem[];
}

interface LegendItem {
  entity: string;
  name: string;
  value: number;
  formattedValue: string;
  color: string;
  isHidden: boolean;
  isDisabled: boolean;
}

@customElement("hui-distribution-card")
export class HuiDistributionCard
  extends MobileAwareMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-distribution-card-editor");
    return document.createElement("hui-distribution-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): DistributionCardConfig {
    const includeDomains = ["sensor"];
    const maxEntities = 3;

    // Strategy 1: Try to find power sensors (W, kW) - most common use case
    const powerFilter = (stateObj: HassEntity): boolean => {
      const unit = stateObj.attributes.unit_of_measurement;
      const stateValue = Number(stateObj.state);
      return (unit === "W" || unit === "kW") && !isNaN(stateValue);
    };

    let foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains,
      powerFilter
    );

    // Strategy 2: If not enough power entities, find largest group with matching device_class
    if (foundEntities.length < 2) {
      // Get all numeric sensors
      const allNumericSensors = entitiesFallback.filter((entityId) => {
        if (!entityId.startsWith("sensor.")) return false;
        const stateObj = hass.states[entityId];
        if (!stateObj) return false;
        const stateValue = Number(stateObj.state);
        return !isNaN(stateValue);
      });

      // Group by device_class
      const deviceClassGroups = new Map<string, string[]>();
      allNumericSensors.forEach((entityId) => {
        const deviceClass =
          hass.states[entityId].attributes.device_class || "none";
        if (!deviceClassGroups.has(deviceClass)) {
          deviceClassGroups.set(deviceClass, []);
        }
        deviceClassGroups.get(deviceClass)!.push(entityId);
      });

      // Find largest group with at least 2 entities
      let largestGroup: string[] = [];
      deviceClassGroups.forEach((group) => {
        if (group.length > largestGroup.length) {
          largestGroup = group;
        }
      });

      // Take first maxEntities from largest group
      if (largestGroup.length >= 2) {
        foundEntities = largestGroup.slice(0, maxEntities);
      }
    }

    return {
      type: "distribution",
      entities: foundEntities,
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: DistributionCardConfig;

  @state() private _configEntities?: ProcessedEntity[];

  @state() private _hiddenEntities = new Set<string>();

  @state() private _expandLegend = false;

  public setConfig(config: DistributionCardConfig): void {
    this._config = config;

    // Handle empty entities gracefully
    if (!config.entities || config.entities.length === 0) {
      this._configEntities = [];
      return;
    }

    const entities = processConfigEntities<DistributionEntityConfig>(
      config.entities
    );

    this._configEntities = entities.map((entity) => ({
      entity: entity.entity,
      name: entity.name,
    }));
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      rows: "auto",
      min_columns: 3,
      fixed_rows: true,
    };
  }

  private _validateDeviceClasses = memoizeOne(
    (entities: ProcessedEntity[], hass: HomeAssistant): string | null => {
      const domains = new Set<string>();
      const deviceClasses = new Set<string>();

      entities.forEach((entity) => {
        const stateObj = hass.states[entity.entity];
        if (stateObj) {
          // Check domain
          const domain = computeDomain(entity.entity);
          domains.add(domain);

          // Default to "none" if no device_class (Home Assistant pattern)
          const deviceClass = stateObj.attributes.device_class || "none";
          deviceClasses.add(deviceClass);
        }
      });

      // If more than one domain, entities are incompatible
      if (domains.size > 1) {
        return hass.localize(
          "ui.panel.lovelace.cards.distribution.domain_mismatch",
          { domains: Array.from(domains).join(", ") }
        );
      }

      // If more than one device_class, entities are incompatible
      if (deviceClasses.size > 1) {
        return hass.localize(
          "ui.panel.lovelace.cards.distribution.device_class_mismatch",
          { classes: Array.from(deviceClasses).join(", ") }
        );
      }

      return null;
    }
  );

  private _convertToSegments(): {
    segments: Segment[];
    hiddenIndices: number[];
  } {
    const computedStyles = getComputedStyle(this);
    const segments: Segment[] = [];
    const hiddenIndices: number[] = [];

    // Access data from instance properties instead of parameters
    if (!this._configEntities || !this.hass) {
      return { segments, hiddenIndices };
    }

    // Map entities with their original index
    const entitiesWithIndex = this._configEntities.map(
      (entity, originalIndex) => ({
        ...entity,
        originalIndex,
      })
    );

    // Create segments for ALL entities (including hidden ones with positive values)
    entitiesWithIndex.forEach((entity) => {
      const stateObj = this.hass!.states[entity.entity];
      if (!stateObj) return;

      const value = Number(stateObj.state);
      if (value <= 0 || isNaN(value)) return;

      const color = getGraphColorByIndex(entity.originalIndex, computedStyles);
      const name = computeLovelaceEntityName(this.hass!, stateObj, entity.name);
      const formattedValue = this.hass!.formatEntityState(stateObj);

      segments.push({
        value: value,
        color: color,
        label: html`${name}
          <span style="color: var(--secondary-text-color)"
            >${formattedValue}</span
          >`,
        entityId: entity.entity,
      });

      // Track hidden indices
      if (this._hiddenEntities.has(entity.entity)) {
        hiddenIndices.push(segments.length - 1);
      }
    });

    return { segments, hiddenIndices };
  }

  private _computeLegendItems(): LegendItem[] {
    if (!this._configEntities || !this.hass) {
      return [];
    }

    const computedStyles = getComputedStyle(this);

    return this._configEntities.map((entity, index) => {
      const stateObj = this.hass!.states[entity.entity];
      const value = stateObj ? Number(stateObj.state) : 0;
      const isHidden = this._hiddenEntities.has(entity.entity);
      const isZeroOrNegative = !stateObj || value <= 0 || isNaN(value);

      const name = stateObj
        ? computeLovelaceEntityName(this.hass!, stateObj, entity.name)
        : entity.entity;

      const formattedValue = stateObj
        ? this.hass!.formatEntityState(stateObj)
        : "";

      return {
        entity: entity.entity,
        name: name,
        value: value,
        formattedValue: formattedValue,
        color: getGraphColorByIndex(index, computedStyles),
        isHidden: isHidden,
        isDisabled: isZeroOrNegative,
      };
    });
  }

  private _toggleEntity(entityId: string): void {
    const newHidden = new Set(this._hiddenEntities);
    if (newHidden.has(entityId)) {
      // Show: remove from hidden list
      newHidden.delete(entityId);
    } else {
      // Hide: add to hidden list
      newHidden.add(entityId);
    }
    this._hiddenEntities = newHidden;
  }

  private _handleSegmentClick(ev: CustomEvent): void {
    const { segment } = ev.detail;
    if (segment.entityId) {
      fireEvent(this, "hass-more-info", { entityId: segment.entityId });
    }
  }

  private _handleLegendClick(ev: Event): void {
    const target = ev.currentTarget as HTMLElement;
    const entityId = target.dataset.entity;
    const disabled = target.dataset.disabled === "true";
    if (entityId && !disabled) {
      this._toggleEntity(entityId);
    }
  }

  private _handleLegendKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._handleLegendClick(ev);
    }
  }

  private _toggleExpandLegend(): void {
    this._expandLegend = !this._expandLegend;
  }

  private _renderLegend(): TemplateResult {
    const legendItems = this._computeLegendItems();
    const overflowLimit = this._isMobileSize
      ? LEGEND_OVERFLOW_LIMIT_MOBILE
      : LEGEND_OVERFLOW_LIMIT;

    return html`
      <ul class="legend">
        ${legendItems.map((item, index) => {
          if (!this._expandLegend && index >= overflowLimit) {
            return nothing;
          }
          return html`
            <li
              class=${classMap({
                "legend-item": true,
                hidden: item.isHidden,
                disabled: item.isDisabled,
              })}
              data-entity=${item.entity}
              data-disabled=${item.isDisabled}
              role="button"
              aria-pressed=${!item.isHidden}
              aria-disabled=${item.isDisabled}
              aria-label=${item.isDisabled
                ? `${item.name} (unavailable)`
                : item.isHidden
                  ? `Show ${item.name}`
                  : `Hide ${item.name}`}
              tabindex=${item.isDisabled ? -1 : 0}
              @click=${this._handleLegendClick}
              @keydown=${this._handleLegendKeydown}
            >
              <div
                class="bullet"
                style=${styleMap({ backgroundColor: item.color })}
              ></div>
              <span class="label">${item.name}</span>
              ${item.formattedValue
                ? html`<span class="value">${item.formattedValue}</span>`
                : nothing}
            </li>
          `;
        })}
        ${legendItems.length > overflowLimit
          ? html`
              <li>
                <ha-assist-chip
                  @click=${this._toggleExpandLegend}
                  filled
                  .label=${this._expandLegend
                    ? this.hass!.localize(
                        "ui.components.history_charts.collapse_legend"
                      )
                    : `${this.hass!.localize(
                        "ui.components.history_charts.expand_legend"
                      )} (${legendItems.length - overflowLimit})`}
                >
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${this._expandLegend ? mdiChevronUp : mdiChevronDown}
                  ></ha-svg-icon>
                </ha-assist-chip>
              </li>
            `
          : nothing}
      </ul>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) {
      return nothing;
    }

    // Show friendly empty state when no entities are configured
    if (!this._configEntities || this._configEntities.length === 0) {
      return html`
        <ha-card .header=${this._config.title}>
          <div class="card-content">
            <div class="empty-state">
              <ha-svg-icon .path=${mdiChartBox}></ha-svg-icon>
              <p>
                ${this.hass.localize(
                  "ui.panel.lovelace.cards.distribution.add_entities"
                )}
              </p>
            </div>
          </div>
        </ha-card>
      `;
    }

    // Check for missing entities
    const missingEntities = this._configEntities.filter(
      (entity) => !this.hass!.states[entity.entity]
    );

    if (missingEntities.length === this._configEntities.length) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${missingEntities.map((entity) =>
            createEntityNotFoundWarning(this.hass!, entity.entity)
          )}
        </hui-warning>
      `;
    }

    // Validate device classes
    const deviceClassError = this._validateDeviceClasses(
      this._configEntities,
      this.hass
    );
    if (deviceClassError) {
      return html`
        <hui-warning .hass=${this.hass}>
          <ha-alert alert-type="error">${deviceClassError}</ha-alert>
        </hui-warning>
      `;
    }

    const segmentData = this._convertToSegments();

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          ${segmentData.segments.length === 0
            ? html`
                <div class="empty-state">
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.distribution.no_data"
                  )}
                </div>
              `
            : html`
                <ha-segmented-bar
                  .heading=${""}
                  .segments=${segmentData.segments}
                  .hiddenSegments=${segmentData.hiddenIndices}
                  bar-clickable
                  hide-legend
                  @segment-clicked=${this._handleSegmentClick}
                ></ha-segmented-bar>
              `}

          <!-- Legend -->
          ${this._renderLegend()}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    ha-alert {
      display: block;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .card-content {
      padding: var(--ha-space-4);
    }

    .legend {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--ha-space-3);
      margin: var(--ha-space-3) 0 0 0;
      padding: 0;
      list-style: none;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--ha-space-1);
      font-size: var(--ha-font-size-s);
      cursor: pointer;
      opacity: 1;
      transition: opacity 0.2s;
    }

    .legend-item:hover {
      opacity: 0.8;
    }

    .legend-item:focus {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
      opacity: 0.8;
    }

    .legend-item.hidden {
      opacity: 0.5;
    }

    .legend-item.hidden .label {
      text-decoration: line-through;
    }

    .legend-item.disabled {
      opacity: 0.5;
      cursor: default;
    }

    .legend-item .bullet {
      width: 12px;
      height: 12px;
      border-radius: var(--ha-border-radius-circle);
      flex-shrink: 0;
    }

    .legend-item .label {
      flex: 0 1 auto;
    }

    .legend-item .value {
      color: var(--secondary-text-color);
      margin-left: var(--ha-space-1);
      flex-shrink: 0;
    }

    .empty-state {
      text-align: center;
      color: var(--secondary-text-color);
      padding: var(--ha-space-4) 0;
    }

    .empty-state ha-svg-icon {
      display: block;
      margin: 0 auto var(--ha-space-2);
      width: 48px;
      height: 48px;
      opacity: 0.3;
    }

    .empty-state p {
      margin: 0;
    }

    @media (max-width: 600px) {
      .card-content {
        padding: var(--ha-space-2);
      }
    }

    ha-assist-chip {
      height: 24px;
      --_label-text-weight: 500;
      --_leading-space: 8px;
      --_trailing-space: 8px;
      --_icon-label-space: 4px;
    }

    .legend li:has(ha-assist-chip) {
      cursor: default;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-distribution-card": HuiDistributionCard;
  }
}
