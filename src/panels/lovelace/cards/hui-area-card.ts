import "@material/mwc-ripple";
import { UnsubscribeFunc } from "home-assistant-js-websocket/dist/types";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { DOMAINS_TOGGLE, STATES_OFF } from "../../../common/const";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { stateIcon } from "../../../common/entity/state_icon";
import { iconColorCSS } from "../../../common/style/icon_color_css";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../data/area_registry";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { AreaCardConfig, EntitiesCardEntityConfig } from "./types";

const AREA_NON_TOGGLE_DOMAINS = ["sensor", "binary_sensor"];

const AREA_SENSOR_CLASSES = [
  "temperature",
  "humidity",
  "aqi",
  "motion",
  "door",
];

@customElement("hui-area-card")
export class HuiAreaCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-area-card-editor");
    return document.createElement("hui-area-card-editor");
  }

  public static getStubConfig(): AreaCardConfig {
    return { type: "area", area: "", image: "" };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Array }) public areas!: AreaRegistryEntry[];

  @state() private _config?: AreaCardConfig;

  @state() private _areas: AreaRegistryEntry[] = [];

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _entitiesDialog?: string[];

  @state() private _entitiesToggle?: string[];

  private _getArea = memoizeOne(
    (
      areaId: string,
      areas: AreaRegistryEntry[]
    ): AreaRegistryEntry | undefined =>
      areas.find((area) => area.area_id === areaId)
  );

  private _memberships = memoizeOne(
    (
      areaId: string,
      registryDevices: DeviceRegistryEntry[],
      registryEntities: EntityRegistryEntry[]
    ) => {
      const devices = new Map();

      for (const device of registryDevices) {
        if (device.area_id === areaId) {
          devices.set(device.id, device);
        }
      }

      const entities: EntityRegistryEntry[] = [];

      for (const entity of registryEntities) {
        const domain = computeDomain(entity.entity_id);
        if (
          !DOMAINS_TOGGLE.has(domain) &&
          !AREA_NON_TOGGLE_DOMAINS.includes(domain)
        ) {
          continue;
        }

        if (entity.area_id) {
          if (entity.area_id === areaId) {
            entities.push(entity);
          }
        } else if (devices.has(entity.device_id)) {
          entities.push(entity);
        }
      }

      return {
        entities,
      };
    }
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
    return 5;
  }

  public setConfig(config: AreaCardConfig): void {
    if (!config.area) {
      throw new Error("Area Required");
    }

    this._config = {
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !oldHass ||
      oldHass.themes !== this.hass!.themes ||
      oldHass.locale !== this.hass!.locale
    ) {
      return true;
    }

    if (this._entitiesDialog) {
      for (const entity of this._entitiesDialog) {
        if (oldHass!.states[entity] !== this.hass!.states[entity]) {
          return true;
        }
      }
    }

    if (this._entitiesToggle) {
      for (const entity of this._entitiesToggle) {
        if (oldHass!.states[entity] !== this.hass!.states[entity]) {
          return true;
        }
      }
    }

    return false;
  }

  protected render(): TemplateResult {
    if (
      !this._config ||
      !this.hass ||
      !this._entitiesDialog ||
      !this._entitiesToggle
    ) {
      return html``;
    }

    const area = this._getArea(this._config.area, this._areas);

    if (this._config.area && !area) {
      return html`
        <hui-warning>
          ${this.hass.localize("ui.card.area.area_not_found")}
        </hui-warning>
      `;
    }

    if (
      this._entitiesDialog.length === 0 &&
      this._entitiesToggle.length === 0
    ) {
      return html`
        <hui-warning>
          ${this.hass.localize("ui.card.area.no_entities")}
        </hui-warning>
      `;
    }

    const toggleEntities: EntitiesCardEntityConfig[] = processConfigEntities(
      this._entitiesToggle!
    ).map((entityConfig) => ({
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      ...entityConfig,
    })) as EntitiesCardEntityConfig[];

    const dialogEntities: EntitiesCardEntityConfig[] = processConfigEntities(
      this._entitiesDialog!
    ).map((entityConfig) => ({
      tap_action: { action: "more-info" },
      hold_action: { action: "more-info" },
      ...entityConfig,
    })) as EntitiesCardEntityConfig[];

    return html`
      <ha-card>
        <img src=${this.hass.hassUrl(this._config.image)} />
        <div class="container">
          <div class="sensors">
            ${dialogEntities.map((entityConf) => {
              const stateObj = this.hass!.states[entityConf.entity];
              return html`
                <span>
                  <ha-icon
                    .config=${entityConf}
                    .icon=${stateIcon(stateObj)}
                    .actionHandler=${actionHandler({
                      hasHold: hasAction(entityConf.hold_action),
                    })}
                    @action=${this._handleAction}
                  ></ha-icon>
                  ${computeDomain(entityConf.entity) === "binary_sensor"
                    ? ""
                    : html`
                        ${computeStateDisplay(
                          this.hass!.localize,
                          stateObj,
                          this.hass!.locale
                        )}
                      `}
                </span>
              `;
            })}
          </div>
          <div class="name">${area!.name}</div>
          <div class="buttons">
            ${toggleEntities.map((entityConf) => {
              const stateObj = this.hass!.states[entityConf.entity];
              return html`
                <ha-icon-button
                  class=${classMap({
                    off: STATES_OFF.includes(stateObj.state),
                  })}
                  .config=${entityConf}
                  .icon=${stateIcon(stateObj)}
                  .actionHandler=${actionHandler({
                    hasHold: hasAction(entityConf.hold_action),
                  })}
                  @action=${this._handleAction}
                ></ha-icon-button>
              `;
            })}
          </div>
        </div>
      </ha-card>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    if (
      !this.hass ||
      !this._config?.area ||
      !this._areas ||
      !this._entities ||
      !this._devices ||
      (!changedProps.has("_entities") && !changedProps.has("_devices"))
    ) {
      return;
    }

    this._entitiesDialog = [];
    this._entitiesToggle = [];

    const { entities } = this._memberships(
      this._config!.area,
      this._devices!,
      this._entities!
    );

    if (entities.length === 0) {
      return;
    }

    entities.forEach((entity) => {
      const domain = computeDomain(entity.entity_id);
      const isToggle = DOMAINS_TOGGLE.has(domain);
      const stateObj = this.hass!.states[entity.entity_id];

      if (isToggle && this._entitiesToggle!.length < 3) {
        this._entitiesToggle!.push(entity.entity_id);
      } else if (
        !isToggle &&
        stateObj.attributes.device_class &&
        AREA_SENSOR_CLASSES.includes(stateObj.attributes.device_class) &&
        this._entitiesDialog!.length < 3
      ) {
        this._entitiesDialog!.push(entity.entity_id);
      }
    });
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as AreaCardConfig | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private _handleAction(ev: ActionHandlerEvent) {
    const config = (ev.currentTarget as any).config as EntitiesCardEntityConfig;
    handleAction(this, this.hass!, config, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
    return [
      iconColorCSS,
      css`
        ha-card {
          overflow: hidden;
          height: 100%;
          position: relative;
        }

        img {
          display: block;
          width: 100%;
        }

        .container {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4));
        }

        .name {
          color: white;
          font-size: 22px;
          font-weight: 300;
          letter-spacing: 0.175rem;
          position: absolute;
          transform: translate(0px, -50%);
          bottom: 1%;
          left: 2%;
        }

        .buttons {
          position: absolute;
          bottom: 4%;
          right: 3%;
        }

        ha-icon-button {
          color: white;
          background-color: rgb(175, 175, 175);
          border-radius: 50%;
          margin-left: 8px;
          --mdc-icon-button-size: 36px;
        }

        ha-icon-button.off {
          background-color: rgba(175, 175, 175, 0.5);
        }

        .sensors {
          color: white;
          font-size: 16px;
          position: absolute;
          top: 5%;
          left: 2%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-card": HuiAreaCard;
  }
}
