import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-relative-time";
import { isUnavailableState } from "../../../data/entity";
import {
  ActionHandlerEvent,
  CallServiceActionConfig,
  MoreInfoActionConfig,
} from "../../../data/lovelace";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-timestamp-display";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import "../components/hui-warning-element";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { GlanceCardConfig, GlanceConfigEntity } from "./types";
import { hasConfigOrEntitiesChanged } from "../common/has-changed";

@customElement("hui-glance-card")
export class HuiGlanceCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-glance-card-editor");
    return document.createElement("hui-glance-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): GlanceCardConfig {
    const includeDomains = ["sensor"];
    const maxEntities = 3;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "glance", entities: foundEntities };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: GlanceCardConfig;

  private _configEntities?: GlanceConfigEntity[];

  public getCardSize(): number {
    const rowHeight =
      (this._config!.show_icon ? 1 : 0) +
      (this._config!.show_name ? 1 : 0) +
      (this._config!.show_state ? 1 : 0);

    const numRows = Math.ceil(
      this._configEntities!.length / (this._config!.columns || 5)
    );

    return (this._config!.title ? 2 : 0) + rowHeight * numRows;
  }

  public setConfig(config: GlanceCardConfig): void {
    this._config = {
      show_name: true,
      show_state: true,
      show_icon: true,
      state_color: true,
      ...config,
    };
    const entities = processConfigEntities<GlanceConfigEntity>(
      config.entities
    ).map((entityConf) => ({
      hold_action: { action: "more-info" } as MoreInfoActionConfig,
      ...entityConf,
    }));

    for (const entity of entities) {
      if (
        (entity.tap_action &&
          entity.tap_action.action === "call-service" &&
          !entity.tap_action.service) ||
        (entity.hold_action &&
          entity.hold_action.action === "call-service" &&
          !(entity.hold_action as CallServiceActionConfig).service)
      ) {
        throw new Error(
          'Missing required property "service" when tap_action or hold_action is call-service'
        );
      }
    }

    const columns = config.columns || Math.min(config.entities.length, 5);
    this.style.setProperty("--glance-column-width", `${100 / columns}%`);

    this._configEntities = entities;

    if (this.hass) {
      this.requestUpdate();
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntitiesChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const { title } = this._config;

    return html`
      <ha-card .header=${title}>
        <div class=${classMap({ entities: true, "no-header": !title })}>
          ${this._configEntities!.map((entityConf) =>
            this.renderEntity(entityConf)
          )}
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
    const oldConfig = changedProps.get("_config") as
      | GlanceCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
      }
      .entities {
        display: flex;
        padding: 0 16px 4px;
        flex-wrap: wrap;
        box-sizing: border-box;
        align-items: center;
        align-content: center;
      }
      .entities.no-header {
        padding-top: 16px;
      }
      .entity {
        box-sizing: border-box;
        padding: 0 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 12px;
        width: var(--glance-column-width, 20%);
      }
      .entity.action {
        cursor: pointer;
      }
      .entity:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 14px;
        padding: 4px;
        margin-top: -4px;
        margin-bottom: 8px;
      }
      .entity div {
        width: 100%;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .name {
        min-height: var(--paper-font-body1_-_line-height, 20px);
      }
      .warning {
        cursor: default;
        position: relative;
        padding: 8px;
        width: calc(var(--glance-column-width, 20%) - 4px);
        margin: 0 2px;
      }
      .warning::before {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        opacity: 0.12;
        pointer-events: none;
        content: "";
        border-radius: 4px;
        background-color: var(--warning-color);
      }
      state-badge {
        margin: 8px 0;
      }
      hui-warning-element {
        padding: 8px;
      }
    `;
  }

  private renderEntity(entityConf): TemplateResult {
    const stateObj = this.hass!.states[entityConf.entity];

    if (!stateObj) {
      return html`<div class="entity warning">
        ${this._config!.show_name
          ? html`
              <div class="name">
                ${createEntityNotFoundWarning(this.hass!, entityConf.entity)}
              </div>
            `
          : ""}
        ${this._config!.show_icon
          ? html` <hui-warning-element
              .label=${createEntityNotFoundWarning(
                this.hass!,
                entityConf.entity
              )}
            ></hui-warning-element>`
          : ""}
        <div>${this._config!.show_state ? entityConf.entity : ""}</div>
      </div>`;
    }

    const name = entityConf.name ?? computeStateName(stateObj);

    const hasAnyAction =
      !entityConf.tap_action ||
      hasAction(entityConf.tap_action) ||
      hasAction(entityConf.hold_action) ||
      hasAction(entityConf.double_tap_action);

    return html`
      <div
        class=${classMap({ entity: true, action: hasAnyAction })}
        .config=${entityConf}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(entityConf.hold_action),
          hasDoubleClick: hasAction(entityConf.double_tap_action),
        })}
        tabindex=${ifDefined(
          !entityConf.tap_action || hasAction(entityConf.tap_action)
            ? "0"
            : undefined
        )}
      >
        ${this._config!.show_name
          ? html` <div class="name" .title=${name}>${name}</div> `
          : ""}
        ${this._config!.show_icon
          ? html`
              <state-badge
                .hass=${this.hass}
                .stateObj=${stateObj}
                .overrideIcon=${entityConf.icon}
                .overrideImage=${entityConf.image}
                .stateColor=${(entityConf.state_color === false ||
                  entityConf.state_color) ??
                this._config!.state_color}
              ></state-badge>
            `
          : ""}
        ${this._config!.show_state && entityConf.show_state !== false
          ? html`
              <div>
                ${computeDomain(entityConf.entity) === "sensor" &&
                stateObj.attributes.device_class ===
                  SENSOR_DEVICE_CLASS_TIMESTAMP &&
                !isUnavailableState(stateObj.state)
                  ? html`
                      <hui-timestamp-display
                        .hass=${this.hass}
                        .ts=${new Date(stateObj.state)}
                        .format=${entityConf.format}
                        capitalize
                      ></hui-timestamp-display>
                    `
                  : entityConf.show_last_changed
                  ? html`
                      <ha-relative-time
                        .hass=${this.hass}
                        .datetime=${stateObj.last_changed}
                        capitalize
                      ></ha-relative-time>
                    `
                  : this.hass!.formatEntityState(stateObj)}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    const config = (ev.currentTarget as any).config as GlanceConfigEntity;
    handleAction(this, this.hass!, config, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card": HuiGlanceCard;
  }
}
