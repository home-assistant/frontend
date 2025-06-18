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
import memoizeOne from "memoize-one";
import { BINARY_STATE_ON } from "../../../common/const";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import { generateEntityFilter } from "../../../common/entity/entity_filter";
import { navigate } from "../../../common/navigate";
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
import "../../../components/ha-ripple";
import "../../../components/ha-svg-icon";
import "../../../components/tile/ha-tile-badge";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import { isUnavailableState } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import "../card-features/hui-card-features";
import type { LovelaceCardFeatureContext } from "../card-features/types";
import { actionHandler } from "../common/directives/action-handler-directive";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import type { AreaCardConfig } from "./types";

export const DEFAULT_ASPECT_RATIO = "16:9";

export const DEVICE_CLASSES = {
  sensor: ["temperature", "humidity"],
  binary_sensor: ["motion", "moisture"],
};

@customElement("hui-area-card")
export class HuiAreaCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: AreaCardConfig;

  @state() private _featureContext: LovelaceCardFeatureContext = {};

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
    this._config = {
      ...config,
      display_type: displayType,
    };

    this._featureContext = {
      area_id: config.area,
    };
  }

  public static async getStubConfig(
    hass: HomeAssistant
  ): Promise<AreaCardConfig> {
    const areas = Object.values(hass.areas);
    return { type: "area", area: areas[0]?.area_id || "" };
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    const columns = 6;
    let min_columns = 6;
    let rows = 1;
    const featurePosition = this._config
      ? this._featurePosition(this._config)
      : "bottom";
    const featuresCount = this._config?.features?.length || 0;
    if (featuresCount) {
      if (featurePosition === "inline") {
        min_columns = 12;
      } else {
        rows += featuresCount;
      }
    }

    const displayType = this._config?.display_type || "picture";

    if (displayType !== "compact") {
      rows += 2;
    }

    return {
      columns,
      rows,
      min_columns,
      min_rows: rows,
    };
  }

  private get _hasCardAction() {
    return this._config?.navigation_path;
  }

  private _handleAction() {
    if (this._config?.navigation_path) {
      navigate(this._config.navigation_path);
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
      sensorClasses: string[]
    ): Map<string, string[]> => {
      const sensorFilter = generateEntityFilter(this.hass, {
        area: areaId,
        entity_category: "none",
        domain: "sensor",
        device_class: sensorClasses,
      });
      const entityIds = Object.keys(entities).filter(sensorFilter);
      return this._groupEntitiesByDeviceClass(entityIds);
    }
  );

  private _groupedBinarySensorEntityIds = memoizeOne(
    (
      entities: HomeAssistant["entities"],
      areaId: string,
      binarySensorClasses: string[]
    ): Map<string, string[]> => {
      const binarySensorFilter = generateEntityFilter(this.hass, {
        area: areaId,
        entity_category: "none",
        domain: "binary_sensor",
        device_class: binarySensorClasses,
      });
      const entityIds = Object.keys(entities).filter(binarySensorFilter);
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

  private _computeActiveAlertStates(): HassEntity[] {
    const areaId = this._config?.area;
    const area = areaId ? this.hass.areas[areaId] : undefined;
    const alertClasses = this._config?.alert_classes;
    if (!area || !alertClasses) {
      return [];
    }
    const groupedEntities = this._groupedBinarySensorEntityIds(
      this.hass.entities,
      area.area_id,
      alertClasses
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
    if (!area || !sensorClasses) {
      return undefined;
    }

    const groupedEntities = this._groupedSensorEntityIds(
      this.hass.entities,
      area.area_id,
      sensorClasses
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

        const entityIds = groupedEntities.get(sensorClass);

        if (!entityIds) {
          return undefined;
        }

        // Ensure all entities have state
        const entities = entityIds
          .map((entityId) => this.hass.states[entityId])
          .filter(Boolean);

        if (entities.length === 0) {
          return undefined;
        }

        // Use the first entity's unit_of_measurement for formatting
        const uom = entities.find(
          (entity) => entity.attributes.unit_of_measurement
        )?.attributes.unit_of_measurement;

        // Ensure all entities have the same unit_of_measurement
        const validEntities = entities.filter(
          (entity) =>
            entity.attributes.unit_of_measurement === uom &&
            isNumericState(entity) &&
            !isNaN(Number(entity.state))
        );

        if (validEntities.length === 0) {
          return undefined;
        }

        const value =
          validEntities.reduce((acc, entity) => acc + Number(entity.state), 0) /
          validEntities.length;

        const formattedAverage = formatNumber(value, this.hass!.locale, {
          maximumFractionDigits: 1,
        });
        const formattedUnit = uom
          ? `${blankBeforeUnit(uom, this.hass!.locale)}${uom}`
          : "";

        return `${formattedAverage}${formattedUnit}`;
      })
      .filter(Boolean)
      .join(" · ");

    return sensorStates;
  }

  private _featurePosition = memoizeOne(
    (config: AreaCardConfig) => config.features_position || "bottom"
  );

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

    const icon = area.icon;

    const name = this._config.name || computeAreaName(area);

    const primary = name;
    const secondary = this._computeSensorsDisplay();

    const featurePosition = this._featurePosition(this._config);
    const features = this._displayedFeatures(this._config);

    const containerOrientationClass =
      featurePosition === "inline" ? "horizontal" : "";

    const displayType = this._config.display_type || "picture";

    const cameraEntityId =
      displayType === "camera"
        ? this._getCameraEntity(this.hass.entities, area.area_id)
        : undefined;

    const ignoreAspectRatio = this.layout === "grid" || this.layout === "panel";

    return html`
      <ha-card>
        <div
          class="background"
          @action=${this._handleAction}
          .actionHandler=${actionHandler()}
          role=${ifDefined(this._hasCardAction ? "button" : undefined)}
          tabindex=${ifDefined(this._hasCardAction ? "0" : undefined)}
          aria-labelledby="info"
        >
          <ha-ripple .disabled=${!this._hasCardAction}></ha-ripple>
        </div>
        ${displayType === "compact"
          ? nothing
          : html`
              <div class="header">
                <div class="picture">
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
                    : area.icon
                      ? html`
                          <ha-aspect-ratio
                            .aspectRatio=${ignoreAspectRatio
                              ? undefined
                              : this._config.aspect_ratio ||
                                DEFAULT_ASPECT_RATIO}
                          >
                            <div class="icon-container">
                              <ha-icon .icon=${area.icon}></ha-icon>
                            </div>
                          </ha-aspect-ratio>
                        `
                      : nothing}
                </div>
                ${this._renderAlertSensors()}
              </div>
            `}
        <div class="container ${containerOrientationClass}">
          <div class="content">
            <ha-tile-icon>
              ${displayType === "compact"
                ? this._renderAlertSensorBadge()
                : nothing}
              ${icon
                ? html`<ha-icon slot="icon" .icon=${icon}></ha-icon>`
                : html`
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiTextureBox}
                    ></ha-svg-icon>
                  `}
            </ha-tile-icon>
            <ha-tile-info
              id="info"
              .primary=${primary}
              .secondary=${secondary}
            ></ha-tile-info>
          </div>
          ${features.length > 0
            ? html`
                <hui-card-features
                  .hass=${this.hass}
                  .context=${this._featureContext}
                  .color=${this._config.color}
                  .features=${features}
                ></hui-card-features>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      --tile-color: var(--state-icon-color);
      -webkit-tap-highlight-color: transparent;
    }
    ha-card:has(.background:focus-visible) {
      --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
      --shadow-focus: 0 0 0 1px var(--tile-color);
      border-color: var(--tile-color);
      box-shadow: var(--shadow-default), var(--shadow-focus);
    }
    ha-card {
      --ha-ripple-color: var(--tile-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
      height: 100%;
      transition:
        box-shadow 180ms ease-in-out,
        border-color 180ms ease-in-out;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    [role="button"] {
      cursor: pointer;
      pointer-events: auto;
    }
    [role="button"]:focus {
      outline: none;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      border-radius: var(--ha-card-border-radius, 12px);
      margin: calc(-1 * var(--ha-card-border-width, 1px));
      overflow: hidden;
    }
    .header {
      flex: 1;
      overflow: hidden;
      border-radius: var(--ha-card-border-radius, 12px);
      border-end-end-radius: 0;
      border-end-start-radius: 0;
      pointer-events: none;
    }
    .picture {
      height: 100%;
      width: 100%;
      background-size: cover;
      background-position: center;
      position: relative;
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
      --mdc-icon-size: 48px;
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
    .container {
      margin: calc(-1 * var(--ha-card-border-width, 1px));
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .header + .container {
      height: auto;
      flex: none;
    }
    .container.horizontal {
      flex-direction: row;
    }

    .content {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 10px;
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      pointer-events: none;
      gap: 10px;
    }

    ha-tile-icon {
      --tile-icon-color: var(--tile-color);
      position: relative;
      padding: 6px;
      margin: -6px;
    }
    ha-tile-badge {
      position: absolute;
      top: 3px;
      right: 3px;
      inset-inline-end: 3px;
      inset-inline-start: initial;
    }
    ha-tile-info {
      position: relative;
      min-width: 0;
      transition: background-color 180ms ease-in-out;
      box-sizing: border-box;
    }
    hui-card-features {
      --feature-color: var(--tile-color);
      padding: 0 12px 12px 12px;
    }
    .container.horizontal hui-card-features {
      width: calc(50% - var(--column-gap, 0px) / 2 - 12px);
      flex: none;
      --feature-height: 36px;
      padding: 0 12px;
      padding-inline-start: 0;
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
      gap: 4px;
      padding: 4px;
      pointer-events: none;
      z-index: 1;
    }
    .alert {
      background-color: var(--orange-color);
      border-radius: 12px;
      width: 24px;
      height: 24px;
      padding: 2px;
      box-sizing: border-box;
      --mdc-icon-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-card": HuiAreaCard;
  }
}
