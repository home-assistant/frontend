import "@material/mwc-ripple";
import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
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
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { DOMAINS_TOGGLE, STATES_OFF } from "../../../common/const";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { navigate } from "../../../common/navigate";
import { iconColorCSS } from "../../../common/style/icon_color_css";
import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import {
  AREA_NON_TOGGLE_DOMAINS,
  AREA_SENSOR_CLASSES,
} from "../../../data/area";
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
import { forwardHaptic } from "../../../data/haptics";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { toggleEntity } from "../common/entity/toggle-entity";
import "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { AreaCardConfig } from "./types";

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

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _entitiesDialog?: string[];

  @state() private _entitiesToggle?: string[];

  @state() private _area?: AreaRegistryEntry;

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

  private _refreshEntities = memoizeOne((entities) => {
    this._entitiesDialog = [];
    this._entitiesToggle = [];

    if (entities.length === 0) {
      return;
    }

    for (const entity of entities) {
      const stateObj: HassEntity | undefined =
        this.hass!.states[entity.entity_id];

      if (!stateObj) {
        continue;
      }

      const domain = computeDomain(entity.entity_id);

      if (this._entitiesToggle!.length < 3 && DOMAINS_TOGGLE.has(domain)) {
        this._entitiesToggle!.push(entity.entity_id);
        continue;
      }

      if (
        this._entitiesDialog!.length < 3 &&
        AREA_NON_TOGGLE_DOMAINS.includes(domain) &&
        stateObj.attributes.device_class &&
        AREA_SENSOR_CLASSES.includes(stateObj.attributes.device_class)
      ) {
        this._entitiesDialog!.push(entity.entity_id);
      }

      if (
        this._entitiesDialog!.length === 3 &&
        this._entitiesToggle!.length === 3
      ) {
        break;
      }
    }

    this.requestUpdate();
  });

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeAreaRegistry(this.hass!.connection, (areas) => {
        this._area = areas.find((area) => area.area_id === this._config!.area);
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

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config")) {
      return true;
    }

    if (
      changedProps.has("_entitiesDialog") ||
      changedProps.has("_entitiesToggle") ||
      changedProps.has("_devices") ||
      changedProps.has("_area") ||
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

    if (this._config.area && !this._area) {
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

    return html`
      <ha-card
        style=${styleMap({
          "background-image": `url(${this.hass.hassUrl(this._config.image)})`,
        })}
      >
        <div class="container">
          <div class="sensors">
            ${this._entitiesDialog.map((entity) => {
              const stateObj = this.hass.states[entity];
              return html`
                <span .entity=${entity} @click=${this._handleMoreInfo}>
                  <ha-state-icon .state=${stateObj}></ha-state-icon>
                  ${computeDomain(entity) === "binary_sensor"
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
          <div class="bottom">
            <div
              class="name ${this._config.navigation_path ? "navigate" : ""}"
              @click=${this._handleNavigation}
            >
              ${this._area!.name}
            </div>
            <div class="buttons">
              ${this._entitiesToggle.map((entity) => {
                const stateObj = this.hass!.states[entity];
                return html`
                  <ha-icon-button
                    class=${classMap({
                      off: STATES_OFF.includes(stateObj.state),
                    })}
                    .entity=${entity}
                    .actionHandler=${actionHandler({
                      hasHold: true,
                    })}
                    @action=${this._handleAction}
                  >
                    <state-badge
                      .hass=${this.hass}
                      .stateObj=${stateObj}
                      stateColor
                    ></state-badge>
                  </ha-icon-button>
                `;
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

    if (!this._config?.area || !this._area) {
      return;
    }

    const { entities } = this._memberships(
      this._config!.area,
      this._devices!,
      this._entities!
    );

    this._refreshEntities(entities);
  }

  private _handleMoreInfo(ev) {
    const entity = (ev.currentTarget as any).entity;
    fireEvent(this, "hass-more-info", { entityId: entity });
  }

  private _handleNavigation() {
    if (this._config!.navigation_path) {
      navigate(this._config!.navigation_path);
    }
  }

  private _handleAction(ev: ActionHandlerEvent) {
    const entity = (ev.currentTarget as any).entity as string;
    if (ev.detail.action === "hold") {
      fireEvent(this, "hass-more-info", { entityId: entity });
    } else if (ev.detail.action === "tap") {
      toggleEntity(this.hass, entity);
      forwardHaptic("light");
    }
  }

  static get styles(): CSSResultGroup {
    return [
      iconColorCSS,
      css`
        ha-card {
          overflow: hidden;
          position: relative;
          padding-bottom: 56.25%;
          background-size: cover;
        }

        .container {
          display: flex;
          flex-direction: column;
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4));
        }

        .sensors {
          color: white;
          font-size: 18px;
          flex: 1;
          padding: 8px;
          --mdc-icon-size: 28px;
          cursor: pointer;
        }

        .name {
          color: white;
          font-size: 24px;
        }

        .bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
        }

        .name.navigate {
          cursor: pointer;
        }

        state-badge {
          --ha-icon-display: inline;
        }

        ha-icon-button {
          color: white;
          background-color: var(--area-button-color, rgb(175, 175, 175, 0.5));
          border-radius: 50%;
          margin-left: 8px;
          --mdc-icon-button-size: 44px;
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
