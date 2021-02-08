import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { ifDefined } from "lit-html/directives/if-defined";
import relativeTime from "../../../common/datetime/relative_time";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import {
  ActionHandlerEvent,
  CallServiceActionConfig,
  MoreInfoActionConfig,
} from "../../../data/lovelace";
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

  @internalProperty() private _config?: GlanceCardConfig;

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
    ).map((entityConf) => {
      return {
        hold_action: { action: "more-info" } as MoreInfoActionConfig,
        ...entityConf,
      };
    });

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
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !this._configEntities ||
      !oldHass ||
      oldHass.themes !== this.hass!.themes ||
      oldHass.language !== this.hass!.language
    ) {
      return true;
    }

    for (const entity of this._configEntities) {
      if (oldHass.states[entity.entity] !== this.hass!.states[entity.entity]) {
        return true;
      }
    }

    return false;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }
    const { title } = this._config;

    return html`
      <ha-card .header="${title}">
        <div class="${classMap({ entities: true, "no-header": !title })}">
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

  static get styles(): CSSResult {
    return css`
      ha-card {
        height: 100%;
      }
      .entities {
        display: flex;
        padding: 0 16px 4px;
        flex-wrap: wrap;
        box-sizing: border-box;
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
        cursor: pointer;
        margin-bottom: 12px;
        width: var(--glance-column-width, 20%);
      }
      .entity:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 14px;
        padding: 4px;
        margin: -4px 0;
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
      state-badge {
        margin: 8px 0;
      }
    `;
  }

  private renderEntity(entityConf): TemplateResult {
    const stateObj = this.hass!.states[entityConf.entity];

    if (!stateObj) {
      return html`
        <hui-warning-element
          .label=${createEntityNotFoundWarning(this.hass!, entityConf.entity)}
        ></hui-warning-element>
      `;
    }

    return html`
      <div
        class="entity"
        .config="${entityConf}"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(entityConf.hold_action),
          hasDoubleClick: hasAction(entityConf.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(entityConf.tap_action) ? "0" : undefined
        )}
      >
        ${this._config!.show_name
          ? html`
              <div class="name">
                ${"name" in entityConf
                  ? entityConf.name
                  : computeStateName(stateObj)}
              </div>
            `
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
                stateObj.attributes.device_class === "timestamp" &&
                !UNAVAILABLE_STATES.includes(stateObj.state)
                  ? html`
                      <hui-timestamp-display
                        .hass=${this.hass}
                        .ts=${new Date(stateObj.state)}
                        .format=${entityConf.format}
                      ></hui-timestamp-display>
                    `
                  : entityConf.show_last_changed
                  ? relativeTime(
                      new Date(stateObj.last_changed),
                      this.hass!.localize
                    )
                  : computeStateDisplay(
                      this.hass!.localize,
                      stateObj,
                      this.hass!.language
                    )}
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
