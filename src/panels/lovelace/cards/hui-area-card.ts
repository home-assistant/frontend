import "@material/mwc-ripple";
import {
  mdiLightbulbMultiple,
  mdiLightbulbMultipleOff,
  mdiRun,
  mdiThermometer,
  mdiToggleSwitch,
  mdiToggleSwitchOff,
  mdiWaterAlert,
  mdiWaterPercent,
} from "@mdi/js";
import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { STATES_OFF } from "../../../common/const";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import { domainIcon } from "../../../common/entity/domain_icon";
import { navigate } from "../../../common/navigate";
import { formatNumber } from "../../../common/number/format_number";
import { subscribeOne } from "../../../common/util/subscribe-one";
import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../data/area_registry";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import { isUnavailableState } from "../../../data/entity";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { forwardHaptic } from "../../../data/haptics";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../types";
import "../components/hui-image";
import "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { AreaCardConfig } from "./types";

const SENSOR_DOMAINS = ["sensor"];

const ALERT_DOMAINS = ["binary_sensor"];

const TOGGLE_DOMAINS = ["light", "switch", "fan"];

const OTHER_DOMAINS = ["camera"];

const DEVICE_CLASSES = {
  sensor: ["temperature", "humidity"],
  binary_sensor: ["motion", "moisture"],
};

const DOMAIN_ICONS = {
  light: { on: mdiLightbulbMultiple, off: mdiLightbulbMultipleOff },
  switch: { on: mdiToggleSwitch, off: mdiToggleSwitchOff },
  fan: { on: domainIcon("fan"), off: domainIcon("fan") },
  sensor: {
    temperature: mdiThermometer,
    humidity: mdiWaterPercent,
  },
  binary_sensor: {
    motion: mdiRun,
    moisture: mdiWaterAlert,
  },
};

@customElement("hui-area-card")
export class HuiAreaCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-area-card-editor");
    return document.createElement("hui-area-card-editor");
  }

  public static async getStubConfig(
    hass: HomeAssistant
  ): Promise<AreaCardConfig> {
    const areas = await subscribeOne(hass.connection, subscribeAreaRegistry);
    return { type: "area", area: areas[0]?.area_id || "" };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: AreaCardConfig;

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _areas?: AreaRegistryEntry[];

  private _entitiesByDomain = memoizeOne(
    (
      areaId: string,
      devicesInArea: Set<string>,
      registryEntities: EntityRegistryEntry[],
      states: HomeAssistant["states"]
    ) => {
      const entitiesInArea = registryEntities
        .filter(
          (entry) =>
            !entry.entity_category &&
            !entry.hidden_by &&
            (entry.area_id
              ? entry.area_id === areaId
              : entry.device_id && devicesInArea.has(entry.device_id))
        )
        .map((entry) => entry.entity_id);

      const entitiesByDomain: { [domain: string]: HassEntity[] } = {};

      for (const entity of entitiesInArea) {
        const domain = computeDomain(entity);
        if (
          !TOGGLE_DOMAINS.includes(domain) &&
          !SENSOR_DOMAINS.includes(domain) &&
          !ALERT_DOMAINS.includes(domain) &&
          !OTHER_DOMAINS.includes(domain)
        ) {
          continue;
        }
        const stateObj: HassEntity | undefined = states[entity];

        if (!stateObj) {
          continue;
        }

        if (
          (SENSOR_DOMAINS.includes(domain) || ALERT_DOMAINS.includes(domain)) &&
          !DEVICE_CLASSES[domain].includes(
            stateObj.attributes.device_class || ""
          )
        ) {
          continue;
        }

        if (!(domain in entitiesByDomain)) {
          entitiesByDomain[domain] = [];
        }
        entitiesByDomain[domain].push(stateObj);
      }

      return entitiesByDomain;
    }
  );

  private _isOn(domain: string, deviceClass?: string): boolean | undefined {
    const entities = this._entitiesByDomain(
      this._config!.area,
      this._devicesInArea(this._config!.area, this._devices!),
      this._entities!,
      this.hass.states
    )[domain];
    if (!entities) {
      return undefined;
    }
    return (
      deviceClass
        ? entities.filter(
            (entity) => entity.attributes.device_class === deviceClass
          )
        : entities
    ).some(
      (entity) =>
        !isUnavailableState(entity.state) && !STATES_OFF.includes(entity.state)
    );
  }

  private _average(domain: string, deviceClass?: string): string | undefined {
    const entities = this._entitiesByDomain(
      this._config!.area,
      this._devicesInArea(this._config!.area, this._devices!),
      this._entities!,
      this.hass.states
    )[domain].filter((entity) =>
      deviceClass ? entity.attributes.device_class === deviceClass : true
    );
    if (!entities) {
      return undefined;
    }
    let uom;
    const values = entities.filter((entity) => {
      if (
        !entity.attributes.unit_of_measurement ||
        isNaN(Number(entity.state))
      ) {
        return false;
      }
      if (!uom) {
        uom = entity.attributes.unit_of_measurement;
        return true;
      }
      return entity.attributes.unit_of_measurement === uom;
    });
    if (!values.length) {
      return undefined;
    }
    const sum = values.reduce(
      (total, entity) => total + Number(entity.state),
      0
    );
    return `${formatNumber(sum / values.length, this.hass!.locale, {
      maximumFractionDigits: 1,
    })} ${uom}`;
  }

  private _area = memoizeOne(
    (areaId: string | undefined, areas: AreaRegistryEntry[]) =>
      areas.find((area) => area.area_id === areaId) || null
  );

  private _devicesInArea = memoizeOne(
    (areaId: string | undefined, devices: DeviceRegistryEntry[]) =>
      new Set(
        areaId
          ? devices
              .filter((device) => device.area_id === areaId)
              .map((device) => device.id)
          : []
      )
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeAreaRegistry(this.hass!.connection, (areas) => {
        this._areas = areas;
      }),
      subscribeDeviceRegistry(this.hass!.connection, (devices) => {
        this._devices = devices;
      }),
      subscribeEntityRegistry(this.hass!.connection, (entries) => {
        this._entities = entries;
      }),
    ];
  }

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: AreaCardConfig): void {
    if (!config.area) {
      throw new Error("Area Required");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config") || !this._config) {
      return true;
    }

    if (
      changedProps.has("_devicesInArea") ||
      changedProps.has("_areas") ||
      changedProps.has("_entities")
    ) {
      return true;
    }

    if (!changedProps.has("hass")) {
      return false;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !oldHass ||
      oldHass.themes !== this.hass!.themes ||
      oldHass.locale !== this.hass!.locale
    ) {
      return true;
    }

    if (
      !this._devices ||
      !this._devicesInArea(this._config.area, this._devices) ||
      !this._entities
    ) {
      return false;
    }

    const entities = this._entitiesByDomain(
      this._config.area,
      this._devicesInArea(this._config.area, this._devices),
      this._entities,
      this.hass.states
    );

    for (const domainEntities of Object.values(entities)) {
      for (const stateObj of domainEntities) {
        if (oldHass!.states[stateObj.entity_id] !== stateObj) {
          return true;
        }
      }
    }

    return false;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this._areas ||
      !this._devices ||
      !this._entities
    ) {
      return nothing;
    }

    const entitiesByDomain = this._entitiesByDomain(
      this._config.area,
      this._devicesInArea(this._config.area, this._devices),
      this._entities,
      this.hass.states
    );
    const area = this._area(this._config.area, this._areas);

    if (area === null) {
      return html`
        <hui-warning>
          ${this.hass.localize("ui.card.area.area_not_found")}
        </hui-warning>
      `;
    }

    const sensors: TemplateResult[] = [];
    SENSOR_DOMAINS.forEach((domain) => {
      if (!(domain in entitiesByDomain)) {
        return;
      }
      DEVICE_CLASSES[domain].forEach((deviceClass) => {
        if (
          entitiesByDomain[domain].some(
            (entity) => entity.attributes.device_class === deviceClass
          )
        ) {
          sensors.push(html`
            ${DOMAIN_ICONS[domain][deviceClass]
              ? html`<ha-svg-icon
                  .path=${DOMAIN_ICONS[domain][deviceClass]}
                ></ha-svg-icon>`
              : ""}
            ${this._average(domain, deviceClass)}
          `);
        }
      });
    });

    let cameraEntityId: string | undefined;
    if (this._config.show_camera && "camera" in entitiesByDomain) {
      cameraEntityId = entitiesByDomain.camera[0].entity_id;
    }

    return html`
      <ha-card class=${area.picture || cameraEntityId ? "image" : ""}>
        ${area.picture || cameraEntityId
          ? html`<hui-image
              .config=${this._config}
              .hass=${this.hass}
              .image=${area.picture ? area.picture : undefined}
              .cameraImage=${cameraEntityId}
              aspectRatio="16:9"
            ></hui-image>`
          : ""}

        <div
          class="container ${classMap({
            navigate: this._config.navigation_path !== undefined,
          })}"
          @click=${this._handleNavigation}
        >
          <div class="alerts">
            ${ALERT_DOMAINS.map((domain) => {
              if (!(domain in entitiesByDomain)) {
                return "";
              }
              return DEVICE_CLASSES[domain].map((deviceClass) =>
                this._isOn(domain, deviceClass)
                  ? html`
                      ${DOMAIN_ICONS[domain][deviceClass]
                        ? html`<ha-svg-icon
                            .path=${DOMAIN_ICONS[domain][deviceClass]}
                          ></ha-svg-icon>`
                        : ""}
                    `
                  : ""
              );
            })}
          </div>
          <div class="bottom">
            <div>
              <div class="name">${area.name}</div>
              ${sensors.length
                ? html`<div class="sensors">${sensors}</div>`
                : ""}
            </div>
            <div class="buttons">
              ${TOGGLE_DOMAINS.map((domain) => {
                if (!(domain in entitiesByDomain)) {
                  return "";
                }

                const on = this._isOn(domain)!;
                return TOGGLE_DOMAINS.includes(domain)
                  ? html`
                      <ha-icon-button
                        class=${on ? "on" : "off"}
                        .path=${DOMAIN_ICONS[domain][on ? "on" : "off"]}
                        .domain=${domain}
                        @click=${this._toggle}
                      >
                      </ha-icon-button>
                    `
                  : "";
              })}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as AreaCardConfig | undefined;

    if (
      (changedProps.has("hass") &&
        (!oldHass || oldHass.themes !== this.hass.themes)) ||
      (changedProps.has("_config") &&
        (!oldConfig || oldConfig.theme !== this._config.theme))
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private _handleNavigation() {
    if (this._config!.navigation_path) {
      navigate(this._config!.navigation_path);
    }
  }

  private _toggle(ev: Event) {
    ev.stopPropagation();
    const domain = (ev.currentTarget as any).domain as string;
    if (TOGGLE_DOMAINS.includes(domain)) {
      this.hass.callService(
        domain,
        this._isOn(domain) ? "turn_off" : "turn_on",
        undefined,
        {
          area_id: this._config!.area,
        }
      );
    }
    forwardHaptic("light");
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        overflow: hidden;
        position: relative;
        padding-bottom: 56.25%;
        background-size: cover;
      }

      ha-card.image {
        padding-bottom: 0;
      }

      .container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(
          0,
          rgba(33, 33, 33, 0.9) 0%,
          rgba(33, 33, 33, 0) 45%
        );
      }

      ha-card:not(.image) .container::before {
        position: absolute;
        content: "";
        width: 100%;
        height: 100%;
        background-color: var(--sidebar-selected-icon-color);
        opacity: 0.12;
      }

      .sensors {
        color: #e3e3e3;
        font-size: 16px;
        --mdc-icon-size: 24px;
        opacity: 0.6;
        margin-top: 8px;
      }

      .alerts {
        padding: 16px;
      }

      .alerts ha-svg-icon {
        background: var(--accent-color);
        color: var(--text-accent-color, var(--text-primary-color));
        padding: 8px;
        border-radius: 50%;
      }

      .name {
        color: white;
        font-size: 24px;
      }

      .bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
      }

      .navigate {
        cursor: pointer;
      }

      ha-icon-button {
        color: white;
        background-color: var(--area-button-color, #727272b2);
        border-radius: 50%;
        margin-left: 8px;
        --mdc-icon-button-size: 44px;
      }
      .on {
        color: var(--state-light-active-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-card": HuiAreaCard;
  }
}
