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
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../data/area_registry";
import { subscribeDeviceRegistry } from "../../../data/device_registry";
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

const SENSOR_DOMAINS = ["sensor", "binary_sensor"];

const SENSOR_DEVICE_CLASSES = [
  "temperature",
  "humidity",
  "motion",
  "door",
  "aqi",
];

const TOGGLE_DOMAINS = new Set(["light", "fan", "switch"]);

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

  @state() private _config?: AreaCardConfig;

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _devicesInArea: Set<string> = new Set();

  // null means area not found. undefined = loading.
  @state() private _area?: AreaRegistryEntry | null;

  private _memberships = memoizeOne(
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
            (entry.area_id
              ? entry.area_id === areaId
              : entry.device_id && devicesInArea.has(entry.device_id))
        )
        .map((entry) => entry.entity_id);

      const sensorEntities: HassEntity[] = [];
      const entitiesToggle: HassEntity[] = [];

      for (const entity of entitiesInArea) {
        const domain = computeDomain(entity);
        if (!TOGGLE_DOMAINS.has(domain) && !SENSOR_DOMAINS.includes(domain)) {
          continue;
        }

        const stateObj: HassEntity | undefined = states[entity];

        if (!stateObj) {
          continue;
        }

        if (entitiesToggle.length < 3 && TOGGLE_DOMAINS.has(domain)) {
          entitiesToggle.push(stateObj);
          continue;
        }

        if (
          sensorEntities.length < 3 &&
          SENSOR_DOMAINS.includes(domain) &&
          stateObj.attributes.device_class &&
          SENSOR_DEVICE_CLASSES.includes(stateObj.attributes.device_class)
        ) {
          sensorEntities.push(stateObj);
        }

        if (sensorEntities.length === 3 && entitiesToggle.length === 3) {
          break;
        }
      }

      return { sensorEntities, entitiesToggle };
    }
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeAreaRegistry(this.hass!.connection, (areas) => {
        this._area =
          areas.find((area) => area.area_id === this._config!.area) || null;
      }),
      subscribeDeviceRegistry(this.hass!.connection, (devices) => {
        this._devicesInArea = new Set(
          this._config
            ? devices
                .filter((device) => device.area_id === this._config!.area_id)
                .map((device) => device.id)
            : []
        );
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

    if (!this._devicesInArea || !this._entities) {
      return false;
    }

    const { sensorEntities, entitiesToggle } = this._memberships(
      this._config.area,
      this._devicesInArea,
      this._entities,
      this.hass.states
    );

    for (const stateObj of sensorEntities) {
      if (oldHass!.states[stateObj.entity_id] !== stateObj) {
        return true;
      }
    }

    for (const stateObj of entitiesToggle) {
      if (oldHass!.states[stateObj.entity_id] !== stateObj) {
        return true;
      }
    }

    return false;
  }

  protected render(): TemplateResult {
    if (
      !this._config ||
      !this.hass ||
      this._area === undefined ||
      !this._devicesInArea ||
      !this._entities
    ) {
      return html``;
    }

    const { sensorEntities, entitiesToggle } = this._memberships(
      this._config.area,
      this._devicesInArea,
      this._entities,
      this.hass.states
    );

    if (this._area === null) {
      return html`
        <hui-warning>
          ${this.hass.localize("ui.card.area.area_not_found")}
        </hui-warning>
      `;
    }

    return html`
      <ha-card
        style=${styleMap({
          "background-image": `url(${this.hass.hassUrl(
            this._config.image || this._area.picture
          )})`,
        })}
      >
        <div class="container">
          <div class="sensors">
            ${sensorEntities.map(
              (stateObj) => html`
                <span
                  .entity=${stateObj.entity_id}
                  @click=${this._handleMoreInfo}
                >
                  <ha-state-icon .state=${stateObj}></ha-state-icon>
                  ${computeDomain(stateObj.entity_id) === "binary_sensor"
                    ? ""
                    : html`
                        ${computeStateDisplay(
                          this.hass!.localize,
                          stateObj,
                          this.hass!.locale
                        )}
                      `}
                </span>
              `
            )}
          </div>
          <div class="bottom">
            <div
              class="name ${this._config.navigation_path ? "navigate" : ""}"
              @click=${this._handleNavigation}
            >
              ${this._area!.name}
            </div>
            <div class="buttons">
              ${entitiesToggle.map(
                (stateObj) => html`
                  <ha-icon-button
                    class=${classMap({
                      off: stateObj.state === "off",
                    })}
                    .entity=${stateObj.entity_id}
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
                `
              )}
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
          background-color: rgba(0, 0, 0, 0.4);
        }

        .sensors {
          color: white;
          font-size: 18px;
          flex: 1;
          padding: 16px;
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
          padding: 8px 8px 8px 16px;
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
