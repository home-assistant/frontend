import { mdiTextureBox } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import { generateEntityFilter } from "../../../common/entity/entity_filter";
import { navigate } from "../../../common/navigate";
import {
  formatNumber,
  isNumericState,
} from "../../../common/number/format_number";
import { blankBeforeUnit } from "../../../common/translations/blank_before_unit";
import "../../../components/ha-card";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-ripple";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import { isUnavailableState } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
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

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-area-card-editor");
    return document.createElement("hui-area-card-editor");
  }

  public setConfig(config: AreaCardConfig): void {
    this._config = config;
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

  private get _hasCardAction() {
    return this._config?.navigation_path;
  }

  private _handleAction() {
    if (this._config?.navigation_path) {
      navigate(this._config.navigation_path);
    }
  }

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

      // Group entities by device class
      return entityIds.reduce((acc, entityId) => {
        const stateObj = this.hass.states[entityId];
        const deviceClass = stateObj.attributes.device_class!;
        if (!acc.has(deviceClass)) {
          acc.set(deviceClass, []);
        }
        acc.get(deviceClass)!.push(stateObj.entity_id);
        return acc;
      }, new Map<string, string[]>());
    }
  );

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
          const stateObj = this.hass.states[area.temperature_entity_id];
          return isUnavailableState(stateObj.state)
            ? ""
            : this.hass.formatEntityState(stateObj);
        }
        if (sensorClass === "humidity" && area.humidity_entity_id) {
          const stateObj = this.hass.states[area.humidity_entity_id];
          return isUnavailableState(stateObj.state)
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

  protected render() {
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

    const name = computeAreaName(area);

    const primary = name;
    const secondary = this._computeSensorsDisplay();

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
        <div class="container">
          <div class="content">
            <ha-tile-icon>
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
    .container {
      margin: calc(-1 * var(--ha-card-border-width, 1px));
      display: flex;
      flex-direction: column;
      flex: 1;
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

    .vertical {
      flex-direction: column;
      text-align: center;
      justify-content: center;
    }
    .vertical ha-tile-info {
      width: 100%;
      flex: none;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-card": HuiAreaCard;
  }
}
