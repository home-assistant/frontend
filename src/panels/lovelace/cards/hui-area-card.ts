import { mdiTextureBox } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { BINARY_STATE_ON } from "../../../common/const";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import { generateEntityFilter } from "../../../common/entity/entity_filter";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import {
  formatNumber,
  isNumericState,
} from "../../../common/number/format_number";
import { blankBeforeUnit } from "../../../common/translations/blank_before_unit";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import "../../../components/ha-aspect-ratio";
import "../../../components/ha-card";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-domain-icon";
import "../../../components/ha-icon";
import "../../../components/tile/ha-tile-badge";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import { isUnavailableState } from "../../../data/entity/entity";
import type { HomeAssistant } from "../../../types";
import "../card-features/hui-card-features";
import type { LovelaceCardFeatureContext } from "../card-features/types";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { AreaCardConfig } from "./types";

export const DEFAULT_ASPECT_RATIO = "16:9";

export const DEVICE_CLASSES = {
  sensor: ["temperature", "humidity"],
  binary_sensor: ["motion", "moisture"],
};

export const SUM_DEVICE_CLASSES = [
  "power",
  "apparent_power",
  "reactive_power",
  "energy",
  "reactive_energy",
  "current",
  "gas",
  "monetary",
  "volume",
  "water",
];

// Additional sources for sensor device classes from entity attributes
// Maps device_class -> array of { domain, attribute } to include in aggregation
export const SENSOR_ATTRIBUTE_SOURCES: Record<
  string,
  { domain: string; attribute: string }[]
> = {
  temperature: [{ domain: "climate", attribute: "current_temperature" }],
  humidity: [
    { domain: "climate", attribute: "current_humidity" },
    { domain: "humidifier", attribute: "current_humidity" },
  ],
};

export interface AreaCardFeatureContext extends LovelaceCardFeatureContext {
  exclude_entities?: string[];
}

@customElement("hui-area-card")
export class HuiAreaCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: AreaCardConfig;

  @state() private _featureContext: AreaCardFeatureContext = {};

  private _ratio: {
    w: number;
    h: number;
  } | null = null;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-area-card-editor");
    return document.createElement("hui-area-card-editor");
  }

  public setConfig(config: AreaCardConfig): void {
    if (!config.area) {
      throw new Error("Specify an area");
    }

    const displayType =
      config.display_type || (config.show_camera ? "camera" : "picture");
    const vertical = displayType === "compact" ? config.vertical : false;

    // Backwards compatibility: convert navigation_path to tap_action
    let tapAction = config.tap_action;
    if (config.navigation_path && !tapAction) {
      tapAction = {
        action: "navigate",
        navigation_path: config.navigation_path,
      };
    }

    // Set smart default for image_tap_action only for camera display type
    let imageTapAction = config.image_tap_action;
    if (displayType === "camera" && !imageTapAction) {
      imageTapAction = { action: "more-info" };
    }

    this._config = {
      ...config,
      vertical,
      display_type: displayType,
      tap_action: tapAction || { action: "none" },
      image_tap_action: imageTapAction,
    };

    this._featureContext = {
      area_id: config.area,
      exclude_entities: config.exclude_entities,
    };
  }

  public static async getStubConfig(
    hass: HomeAssistant
  ): Promise<AreaCardConfig> {
    const areas = Object.values(hass.areas);
    return { type: "area", area: areas[0]?.area_id || "" };
  }

  public getCardSize(): number {
    const featuresPosition =
      this._config && this._featurePosition(this._config);
    const displayType = this._config?.display_type || "picture";
    const featuresCount = this._config?.features?.length || 0;
    return (
      1 +
      (displayType === "compact" ? (this._config?.vertical ? 1 : 0) : 2) +
      (featuresPosition === "inline" ? 0 : featuresCount)
    );
  }

  public getGridOptions(): LovelaceGridOptions {
    let columns = 6;
    let min_columns = 6;
    let rows = 1;
    const featurePosition = this._config
      ? this._featurePosition(this._config)
      : "bottom";
    const featuresCount = this._config?.features?.length || 0;
    if (featuresCount) {
      if (featurePosition === "inline") {
        min_columns = 12;
        columns = 12;
      } else {
        rows += featuresCount;
      }
    }

    const displayType = this._config?.display_type || "picture";

    if (this._config?.vertical) {
      rows++;
      min_columns = 3;
    }

    if (displayType !== "compact") {
      if (featurePosition === "inline" && featuresCount > 0) {
        rows += 3;
      } else {
        rows += 2;
      }
    }

    return {
      columns,
      rows,
      min_columns,
      min_rows: rows,
    };
  }

  private get _hasCardAction() {
    return hasAction(this._config?.tap_action);
  }

  private get _hasImageAction() {
    if (this._config?.display_type === "compact") {
      return false;
    }
    // Image is interactive if it has its own action OR if card has an action
    return (
      hasAction(this._config?.image_tap_action) ||
      hasAction(this._config?.tap_action)
    );
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private _handleImageAction(ev: ActionHandlerEvent) {
    if (hasAction(this._config?.image_tap_action)) {
      const entity =
        this._config?.display_type === "camera"
          ? this._getCameraEntity(this.hass.entities, this._config.area!)
          : undefined;
      handleAction(
        this,
        this.hass!,
        { entity, tap_action: this._config!.image_tap_action },
        ev.detail.action!
      );
    } else {
      handleAction(this, this.hass!, this._config!, ev.detail.action!);
    }
  }

  private _groupEntitiesByDeviceClass = (
    entityIds: string[]
  ): Map<string, string[]> =>
    entityIds.reduce((acc, entityId) => {
      const stateObj = this.hass.states[entityId];
      const deviceClass = stateObj.attributes.device_class!;
      if (!acc.has(deviceClass)) {
        acc.set(deviceClass, []);
      }
      acc.get(deviceClass)!.push(stateObj.entity_id);
      return acc;
    }, new Map<string, string[]>());

  private _groupedSensorEntityIds = memoizeOne(
    (
      entities: HomeAssistant["entities"],
      areaId: string,
      sensorClasses: string[],
      excludeEntities?: string[]
    ): Map<string, string[]> => {
      const sensorFilter = generateEntityFilter(this.hass, {
        area: areaId,
        entity_category: "none",
        domain: "sensor",
        device_class: sensorClasses,
      });
      const entityIds = Object.keys(entities).filter(
        (id) => sensorFilter(id) && !excludeEntities?.includes(id)
      );

      return this._groupEntitiesByDeviceClass(entityIds);
    }
  );

  private _groupedBinarySensorEntityIds = memoizeOne(
    (
      entities: HomeAssistant["entities"],
      areaId: string,
      binarySensorClasses: string[],
      excludeEntities?: string[]
    ): Map<string, string[]> => {
      const binarySensorFilter = generateEntityFilter(this.hass, {
        area: areaId,
        entity_category: "none",
        domain: "binary_sensor",
        device_class: binarySensorClasses,
      });

      const entityIds = Object.keys(entities).filter(
        (id) => binarySensorFilter(id) && !excludeEntities?.includes(id)
      );

      return this._groupEntitiesByDeviceClass(entityIds);
    }
  );

  private _getCameraEntity = memoizeOne(
    (
      entities: HomeAssistant["entities"],
      areaId: string
    ): string | undefined => {
      const cameraFilter = generateEntityFilter(this.hass, {
        area: areaId,
        entity_category: "none",
        domain: "camera",
      });
      const cameraEntities = Object.keys(entities).filter(cameraFilter);
      return cameraEntities.length > 0 ? cameraEntities[0] : undefined;
    }
  );

  private _domainEntityIds = memoizeOne(
    (
      entities: HomeAssistant["entities"],
      areaId: string,
      domains: string[],
      excludeEntities?: string[]
    ): string[] => {
      const filter = generateEntityFilter(this.hass, {
        area: areaId,
        entity_category: "none",
        domain: domains,
      });
      return Object.keys(entities).filter(
        (id) => filter(id) && !excludeEntities?.includes(id)
      );
    }
  );

  private _computeActiveAlertStates(): HassEntity[] {
    const areaId = this._config?.area;
    const area = areaId ? this.hass.areas[areaId] : undefined;
    const alertClasses = this._config?.alert_classes;
    const excludeEntities = this._config?.exclude_entities;
    if (!area || !alertClasses) {
      return [];
    }
    const groupedEntities = this._groupedBinarySensorEntityIds(
      this.hass.entities,
      area.area_id,
      alertClasses,
      excludeEntities
    );

    return (
      alertClasses
        .map((alertClass) => {
          const entityIds = groupedEntities.get(alertClass) || [];
          if (!entityIds) {
            return [];
          }
          return entityIds
            .map(
              (entityId) => this.hass.states[entityId] as HassEntity | undefined
            )
            .filter((stateObj) => stateObj?.state === BINARY_STATE_ON);
        })
        .filter((activeAlerts) => activeAlerts.length > 0)
        // Only return the first active entity for each alert class
        .map((activeAlerts) => activeAlerts[0]!)
    );
  }

  private _renderAlertSensorBadge(): TemplateResult<1> | typeof nothing {
    const states = this._computeActiveAlertStates();

    if (states.length === 0) {
      return nothing;
    }

    // Only render the first one when using a badge
    const stateObj = states[0] as HassEntity | undefined;

    return html`
      <ha-tile-badge class="alert-badge">
        <ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>
      </ha-tile-badge>
    `;
  }

  private _renderAlertSensors(): TemplateResult<1> | typeof nothing {
    const states = this._computeActiveAlertStates();

    if (states.length === 0) {
      return nothing;
    }
    return html`
      <div class="alerts">
        ${states.map(
          (stateObj) => html`
            <div class="alert">
              <ha-state-icon
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-state-icon>
            </div>
          `
        )}
      </div>
    `;
  }

  private _computeSensorsDisplay(): string | undefined {
    const areaId = this._config?.area;
    const area = areaId ? this.hass.areas[areaId] : undefined;
    const sensorClasses = this._config?.sensor_classes;
    const excludeEntities = this._config?.exclude_entities;
    if (!area || !sensorClasses) {
      return undefined;
    }

    const groupedEntities = this._groupedSensorEntityIds(
      this.hass.entities,
      area.area_id,
      sensorClasses,
      excludeEntities
    );

    const sensorStates = sensorClasses
      .map((sensorClass) => {
        if (sensorClass === "temperature" && area.temperature_entity_id) {
          const stateObj = this.hass.states[area.temperature_entity_id] as
            | HassEntity
            | undefined;
          return !stateObj || isUnavailableState(stateObj.state)
            ? ""
            : this.hass.formatEntityState(stateObj);
        }
        if (sensorClass === "humidity" && area.humidity_entity_id) {
          const stateObj = this.hass.states[area.humidity_entity_id] as
            | HassEntity
            | undefined;
          return !stateObj || isUnavailableState(stateObj.state)
            ? ""
            : this.hass.formatEntityState(stateObj);
        }

        const sensorEntityIds = groupedEntities.get(sensorClass) || [];
        const values: number[] = [];
        let uom: string | undefined;

        // Track devices that have sensor entities contributing values
        // to avoid duplicate readings from climate/humidifier attributes
        const devicesWithSensorValues = new Set<string>();

        for (const entityId of sensorEntityIds) {
          const stateObj = this.hass.states[entityId];
          if (
            stateObj &&
            !isUnavailableState(stateObj.state) &&
            isNumericState(stateObj) &&
            !isNaN(Number(stateObj.state))
          ) {
            if (!uom) {
              uom = stateObj.attributes.unit_of_measurement;
            }
            if (stateObj.attributes.unit_of_measurement === uom) {
              values.push(Number(stateObj.state));
              // Track the device this sensor belongs to
              const entityEntry = this.hass.entities[entityId];
              if (entityEntry?.device_id) {
                devicesWithSensorValues.add(entityEntry.device_id);
              }
            }
          }
        }

        // Collect values from additional attribute sources
        const attrSources = SENSOR_ATTRIBUTE_SOURCES[sensorClass];
        if (attrSources) {
          const domains = [...new Set(attrSources.map((s) => s.domain))];
          const attrEntityIds = this._domainEntityIds(
            this.hass.entities,
            area.area_id,
            domains,
            excludeEntities
          );

          for (const entityId of attrEntityIds) {
            const stateObj = this.hass.states[entityId];
            if (!stateObj) continue;

            // Skip if this entity's device already has a sensor contributing values
            const entityEntry = this.hass.entities[entityId];
            if (
              entityEntry?.device_id &&
              devicesWithSensorValues.has(entityEntry.device_id)
            ) {
              continue;
            }

            const domain = entityId.split(".")[0];
            const source = attrSources.find((s) => s.domain === domain);
            if (!source) continue;

            const attrValue = stateObj.attributes[source.attribute];
            if (attrValue == null || isNaN(Number(attrValue))) continue;

            if (!uom) {
              // Determine unit from attribute
              uom = this._getAttributeUnit(sensorClass, domain);
            }
            values.push(Number(attrValue));
          }
        }

        if (values.length === 0) {
          return undefined;
        }

        const value = SUM_DEVICE_CLASSES.includes(sensorClass)
          ? values.reduce((acc, v) => acc + v, 0)
          : this._computeMedianValue(values);

        const formattedValue = formatNumber(value, this.hass.locale, {
          maximumFractionDigits: 1,
        });
        const formattedUnit = uom
          ? `${blankBeforeUnit(uom, this.hass.locale)}${uom}`
          : "";

        return `${formattedValue}${formattedUnit}`;
      })
      .filter(Boolean)
      .join(" · ");

    return sensorStates;
  }

  private _getAttributeUnit(sensorClass: string, domain: string): string {
    // Return the expected unit for attributes from specific domains
    if (sensorClass === "temperature" && domain === "climate") {
      return this.hass.config.unit_system.temperature;
    }
    if (sensorClass === "humidity") {
      return "%";
    }
    return "";
  }

  private _computeMedianValue(values: number[]): number {
    const sortedValues = [...values].sort((a, b) => a - b);
    if (sortedValues.length % 2 === 0) {
      const medianIndex = sortedValues.length / 2;
      return (sortedValues[medianIndex] + sortedValues[medianIndex - 1]) / 2;
    }
    const medianIndex = Math.floor(sortedValues.length / 2);
    return sortedValues[medianIndex];
  }

  private _featurePosition = memoizeOne((config: AreaCardConfig) => {
    if (config.vertical) {
      return "bottom";
    }
    return config.features_position || "bottom";
  });

  private _displayedFeatures = memoizeOne((config: AreaCardConfig) => {
    const features = config.features || [];
    const featurePosition = this._featurePosition(config);

    if (featurePosition === "inline") {
      return features.slice(0, 1);
    }
    return features;
  });

  public willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("_config") || this._ratio === null) {
      this._ratio = this._config?.aspect_ratio
        ? parseAspectRatio(this._config?.aspect_ratio)
        : null;

      if (this._ratio === null || this._ratio.w <= 0 || this._ratio.h <= 0) {
        this._ratio = parseAspectRatio(DEFAULT_ASPECT_RATIO);
      }
    }
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const areaId = this._config?.area;
    const area = areaId ? this.hass.areas[areaId] : undefined;

    if (!area) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${this.hass.localize("ui.card.area.area_not_found")}
        </hui-warning>
      `;
    }

    const icon = area.icon || undefined;

    const name = this._config.name || computeAreaName(area);

    const primary = name;
    const secondary = this._computeSensorsDisplay();

    const featurePosition = this._featurePosition(this._config);
    const features = this._displayedFeatures(this._config);

    const displayType = this._config.display_type || "picture";

    const cameraEntityId =
      displayType === "camera"
        ? this._getCameraEntity(this.hass.entities, area.area_id)
        : undefined;

    const ignoreAspectRatio = this.layout === "grid" || this.layout === "panel";

    const color = this._config.color
      ? computeCssColor(this._config.color)
      : undefined;

    const style = {
      "--tile-color": color,
    };

    return html`
      <ha-card style=${styleMap(style)}>
        ${displayType === "compact"
          ? nothing
          : html`
              <div class="header">
                <div
                  class="picture"
                  @action=${this._handleImageAction}
                  .actionHandler=${this._hasImageAction
                    ? actionHandler()
                    : nothing}
                  role=${ifDefined(this._hasImageAction ? "button" : undefined)}
                  tabindex=${ifDefined(this._hasImageAction ? "0" : undefined)}
                >
                  ${(displayType === "picture" || displayType === "camera") &&
                  (cameraEntityId || area.picture)
                    ? html`
                        <hui-image
                          .cameraImage=${cameraEntityId}
                          .cameraView=${this._config.camera_view}
                          .image=${area.picture ? area.picture : undefined}
                          .hass=${this.hass}
                          fit-mode="cover"
                          .aspectRatio=${ignoreAspectRatio
                            ? undefined
                            : this._config.aspect_ratio || DEFAULT_ASPECT_RATIO}
                        ></hui-image>
                      `
                    : html`
                        <ha-aspect-ratio
                          .aspectRatio=${ignoreAspectRatio
                            ? undefined
                            : this._config.aspect_ratio || DEFAULT_ASPECT_RATIO}
                        >
                          <div class="icon-container">
                            ${area.icon
                              ? html`<ha-icon .icon=${area.icon}></ha-icon>`
                              : nothing}
                          </div>
                        </ha-aspect-ratio>
                      `}
                </div>
                ${this._renderAlertSensors()}
              </div>
            `}
        <ha-tile-container
          .featurePosition=${featurePosition}
          .vertical=${Boolean(this._config.vertical)}
          .interactive=${Boolean(this._hasCardAction)}
          .actionHandler=${actionHandler()}
          @action=${this._handleAction}
        >
          <ha-tile-icon
            slot="icon"
            .icon=${icon}
            .iconPath=${icon ? undefined : mdiTextureBox}
          >
            ${displayType === "compact"
              ? this._renderAlertSensorBadge()
              : nothing}
          </ha-tile-icon>
          <ha-tile-info
            slot="info"
            .primary=${primary}
            .secondary=${secondary}
          ></ha-tile-info>
          ${features.length > 0
            ? html`
                <hui-card-features
                  slot="features"
                  .hass=${this.hass}
                  .context=${this._featureContext}
                  .color=${this._config.color}
                  .features=${features}
                  .position=${featurePosition}
                ></hui-card-features>
              `
            : nothing}
        </ha-tile-container>
      </ha-card>
    `;
  }

  static styles = [
    tileCardStyle,
    css`
      :host {
        --tile-color: var(--state-icon-color);
      }
      ha-card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .header {
        flex: 1;
        overflow: hidden;
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
        border-end-end-radius: 0;
        border-end-start-radius: 0;
        position: relative;
        z-index: 1;
      }
      .picture {
        height: 100%;
        width: 100%;
        background-size: cover;
        background-position: center;
        position: relative;
        pointer-events: none;
      }
      .picture[role="button"] {
        pointer-events: auto;
        cursor: pointer;
      }
      .picture[role="button"]:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }
      .picture hui-image {
        height: 100%;
      }
      .picture .icon-container {
        height: 100%;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: var(--ha-space-12);
        color: var(--tile-color);
      }
      .picture .icon-container::before {
        position: absolute;
        content: "";
        width: 100%;
        height: 100%;
        background-color: var(--tile-color);
        opacity: 0.12;
      }
      .header + ha-tile-container {
        height: auto;
        flex: none;
      }
      ha-tile-badge {
        position: absolute;
        top: 3px;
        right: 3px;
        inset-inline-end: 3px;
        inset-inline-start: initial;
      }
      hui-card-features {
        --feature-color: var(--tile-color);
      }
      .alert-badge {
        --tile-badge-background-color: var(--orange-color);
      }
      .alerts {
        position: absolute;
        top: 0;
        left: 0;
        display: flex;
        flex-direction: row;
        gap: var(--ha-space-2);
        padding: var(--ha-space-2);
        pointer-events: none;
        z-index: 1;
      }
      .alert {
        background-color: var(--orange-color);
        border-radius: var(--ha-border-radius-lg);
        width: var(--ha-space-6);
        height: var(--ha-space-6);
        padding: 2px;
        box-sizing: border-box;
        --mdc-icon-size: var(--ha-space-4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-card": HuiAreaCard;
  }
}
