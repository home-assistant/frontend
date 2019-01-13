import {
  html,
  LitElement,
  PropertyValues,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { longPress } from "../common/directives/long-press-directive";
import { EntityConfig } from "../entity-rows/types";
import { processConfigEntities } from "../common/process-config-entities";

import computeStateDisplay from "../../../common/entity/compute_state_display";
import computeStateName from "../../../common/entity/compute_state_name";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";

import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import { handleClick } from "../common/handle-click";

export interface ConfigEntity extends EntityConfig {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export interface Config extends LovelaceCardConfig {
  show_name?: boolean;
  show_state?: boolean;
  title?: string;
  theme?: string;
  entities: ConfigEntity[];
  columns?: number;
}

export class HuiGlanceCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-glance-card-editor" */ "../editor/config-elements/hui-glance-card-editor");
    return document.createElement("hui-glance-card-editor");
  }
  public static getStubConfig(): object {
    return { entities: [] };
  }

  public hass?: HomeAssistant;
  private _config?: Config;
  private _configEntities?: ConfigEntity[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public getCardSize(): number {
    return (
      (this._config!.title ? 1 : 0) +
      Math.ceil(this._configEntities!.length / 5)
    );
  }

  public setConfig(config: Config): void {
    this._config = { theme: "default", ...config };
    const entities = processConfigEntities<ConfigEntity>(config.entities);

    for (const entity of entities) {
      if (
        (entity.tap_action &&
          entity.tap_action.action === "call-service" &&
          !entity.tap_action.service) ||
        (entity.hold_action &&
          entity.hold_action.action === "call-service" &&
          !entity.hold_action.service)
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
    if (oldHass && this._configEntities) {
      for (const entity of this._configEntities) {
        if (
          oldHass.states[entity.entity] !== this.hass!.states[entity.entity]
        ) {
          return true;
        }
      }
      return false;
    }
    return true;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }
    const { title } = this._config;

    return html`
      ${this.renderStyle()}
      <ha-card .header="${title}">
        <div class="entities ${classMap({ "no-header": !title })}">
          ${
            this._configEntities!.map((entityConf) =>
              this.renderEntity(entityConf)
            )
          }
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!this._config || !this.hass) {
      return;
    }

    const oldHass = changedProperties.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.themes !== this.hass.themes) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .entities {
          display: flex;
          padding: 0 16px 4px;
          flex-wrap: wrap;
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
        .not-found {
          background-color: yellow;
          text-align: center;
        }
      </style>
    `;
  }

  private renderEntity(entityConf): TemplateResult {
    const stateObj = this.hass!.states[entityConf.entity];

    if (!stateObj) {
      return html`
        <div class="entity not-found">
          <div class="name">${entityConf.entity}</div>
          Entity Not Available
        </div>
      `;
    }

    return html`
      <div
        class="entity"
        .entityConf="${entityConf}"
        @ha-click="${this._handleTap}"
        @ha-hold="${this._handleHold}"
        .longPress="${longPress()}"
      >
        ${
          this._config!.show_name !== false
            ? html`
                <div class="name">
                  ${
                    "name" in entityConf
                      ? entityConf.name
                      : computeStateName(stateObj)
                  }
                </div>
              `
            : ""
        }
        <state-badge
          .stateObj="${stateObj}"
          .overrideIcon="${entityConf.icon}"
        ></state-badge>
        ${
          this._config!.show_state !== false
            ? html`
                <div>
                  ${
                    computeStateDisplay(
                      this.localize,
                      stateObj,
                      this.hass!.language
                    )
                  }
                </div>
              `
            : ""
        }
      </div>
    `;
  }

  private _handleTap(ev: MouseEvent) {
    const config = (ev.currentTarget as any).entityConf as ConfigEntity;
    handleClick(this, this.hass!, config, false);
  }

  private _handleHold(ev: MouseEvent) {
    const config = (ev.currentTarget as any).entityConf as ConfigEntity;
    handleClick(this, this.hass!, config, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card": HuiGlanceCard;
  }
}

customElements.define("hui-glance-card", HuiGlanceCard);
