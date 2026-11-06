import {
  mdiSprout,
  mdiThermometer,
  mdiWaterPercent,
  mdiWhiteBalanceSunny,
} from "@mdi/js";
import type {
  HassConfig,
  HassEntities,
  HassEntity,
} from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import {
  consumeEntityRegistryEntry,
  consumeEntityState,
  consumeLocalize,
  preserveUnchangedEntityStatesRecord,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { batteryLevelIcon } from "../../../common/entity/battery_icon";
import { batteryStateColorProperty } from "../../../common/entity/color/battery_color";
import { valueFromParts } from "../../../common/entity/value_parts";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import {
  configContext,
  formattersContext,
  statesContext,
  uiContext,
} from "../../../data/context";
import type { EntityRegistryDisplayEntry } from "../../../data/entity/entity_registry";
import type { Themes } from "../../../data/ws-themes";
import { computeCssVariable } from "../../../resources/css-variables";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantUI,
} from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { PlantAttributeTarget, PlantStatusCardConfig } from "./types";

const SENSOR_ICONS = {
  moisture: mdiWaterPercent,
  temperature: mdiThermometer,
  brightness: mdiWhiteBalanceSunny,
  conductivity: mdiSprout,
  battery: undefined,
};

@customElement("hui-plant-status-card")
class HuiPlantStatusCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-plant-status-card-editor");
    return document.createElement("hui-plant-status-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): PlantStatusCardConfig {
    const includeDomains = ["plant"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "plant-status", entity: foundEntities[0] || "" };
  }

  @state() private _config?: PlantStatusCardConfig;

  @state()
  @consumeEntityState({ entityIdPath: ["_config", "entity"] })
  private _stateObj?: HassEntity;

  @state()
  @consumeEntityRegistryEntry({ entityIdPath: ["_config", "entity"] })
  _entity?: EntityRegistryDisplayEntry;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, Record<string, HassEntity>>({
    transformer: function (this: HuiPlantStatusCard, states) {
      return this._selectSensorStates(states);
    },
    watch: ["_config"],
  })
  private _sensorStates?: Record<string, HassEntity>;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PlantStatusCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "plant") {
      throw new Error("Specify an entity from within the plant domain");
    }

    this._config = config;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this._themes) {
      return;
    }
    const oldThemes = changedProps.get("_themes") as Themes | undefined;
    const oldConfig = changedProps.get("_config") as
      PlantStatusCardConfig | undefined;

    if (
      !oldThemes ||
      !oldConfig ||
      oldThemes !== this._themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this._themes, this._config.theme);
    }
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const stateObj = this._stateObj;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this._localize, this._hassConfig)}
        </hui-warning>
      `;
    }

    const attributes = this._computeAttributes(stateObj);
    let batteryColorVar: string | undefined;
    if (attributes.includes("battery")) {
      const batteryLevel = stateObj.attributes.battery;
      const batteryColorProperty = batteryStateColorProperty(batteryLevel);
      if (batteryColorProperty) {
        batteryColorVar = computeCssVariable(batteryColorProperty);
      }
    }

    return html`
      <ha-card
        class=${stateObj.attributes.entity_picture ? "has-plant-image" : ""}
      >
        <div
          class="banner"
          style="background-image:url(${stateObj.attributes.entity_picture})"
        >
          <div class="header">
            ${this._formatters.formatEntityName(stateObj, this._config.name)}
          </div>
        </div>
        <div class="content">
          ${attributes.map(
            (item) => html`
              <div
                class="attributes"
                @action=${this._handleMoreInfo}
                .actionHandler=${actionHandler()}
                tabindex="0"
                .value=${item}
              >
                <div class="icon">
                  ${
                    item === "battery"
                      ? html`<ha-icon
                          style="color: ${batteryColorVar};"
                          .icon=${batteryLevelIcon(stateObj.attributes.battery)}
                        ></ha-icon>`
                      : html`<ha-svg-icon
                          .path=${SENSOR_ICONS[item]}
                        ></ha-svg-icon>`
                  }
                </div>
                <div
                  class=${
                    stateObj.attributes.problem.indexOf(item) === -1
                      ? ""
                      : "problem"
                  }
                >
                  ${this._formatSensorValue(stateObj, item)}
                </div>
                <div class="uom">
                  ${stateObj.attributes.unit_of_measurement_dict[item] || ""}
                </div>
              </div>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      height: 100%;
      box-sizing: border-box;
    }
    .banner {
      display: flex;
      align-items: flex-end;
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
      padding-top: 12px;
    }

    .has-plant-image .banner {
      padding-top: 30%;
    }

    .header {
      font-family: var(--ha-font-family-body);
      -webkit-font-smoothing: var(--ha-font-smoothing);
      -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
      font-size: var(--ha-font-size-2xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-normal);
      padding: 8px 16px;
    }

    .has-plant-image .header {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
      line-height: 16px;
      padding: 16px;
      color: white;
      width: 100%;
      background: rgba(0, 0, 0, var(--dark-secondary-opacity));
    }

    .content {
      display: flex;
      justify-content: space-between;
      padding: 16px 32px 24px 32px;
    }

    .has-plant-image .content {
      padding-bottom: 16px;
    }

    .icon {
      margin-bottom: 8px;
    }

    ha-icon,
    ha-svg-icon {
      color: var(--state-icon-color);
    }

    .attributes {
      cursor: pointer;
    }

    .attributes:focus {
      outline: none;
      background: var(--divider-color);
      border-radius: var(--ha-border-radius-pill);
    }

    .attributes div {
      text-align: center;
    }

    .problem {
      color: var(--error-color);
      font-weight: var(--ha-font-weight-bold);
    }

    .uom {
      color: var(--secondary-text-color);
    }
  `;

  private _selectSensorStates(
    states: HassEntities | undefined
  ): Record<string, HassEntity> | undefined {
    const plantId = this._config?.entity;
    const sensors = plantId ? states?.[plantId]?.attributes.sensors : undefined;
    if (!states || !sensors) {
      return undefined;
    }
    const next: Record<string, HassEntity> = {};
    for (const entityId of Object.values(sensors) as string[]) {
      if (states[entityId]) {
        next[entityId] = states[entityId];
      }
    }
    return preserveUnchangedEntityStatesRecord(this._sensorStates, next);
  }

  private _formatSensorValue(stateObj: HassEntity, attribute: string): string {
    const sensorEntityId = stateObj.attributes.sensors?.[attribute];
    const sensorStateObj = sensorEntityId
      ? this._sensorStates?.[sensorEntityId]
      : undefined;
    if (sensorStateObj) {
      return valueFromParts(
        this._formatters.formatEntityStateToParts(sensorStateObj)
      );
    }
    return stateObj.attributes[attribute] ?? "";
  }

  private _computeAttributes(stateObj: HassEntity): string[] {
    return Object.keys(SENSOR_ICONS).filter(
      (key) => key in stateObj.attributes
    );
  }

  private _handleMoreInfo(ev: Event): void {
    const target = ev.currentTarget! as PlantAttributeTarget;
    const stateObj = this._stateObj;

    if (target.value && stateObj) {
      fireEvent(this, "hass-more-info", {
        entityId: stateObj.attributes.sensors[target.value],
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-plant-status-card": HuiPlantStatusCard;
  }
}
