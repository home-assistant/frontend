import {
  html,
  LitElement,
  PropertyValues,
  PropertyDeclarations,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import { classMap } from "lit-html/directives/classMap";

import computeStateDisplay from "../../../common/entity/compute_state_display";
import computeStateName from "../../../common/entity/compute_state_name";
import processConfigEntities from "../common/process-config-entities";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";

import toggleEntity from "../common/entity/toggle-entity";

import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "../../../components/ha-icon";

import { fireEvent } from "../../../common/dom/fire_event";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceConfig } from "../types";
import { longPress } from "../common/directives/long-press-directive";

interface EntityConfig {
  name: string;
  icon: string;
  entity: string;
  tap_action: "toggle" | "call-service" | "more-info";
  hold_action?: "toggle" | "call-service" | "more-info";
  service?: string;
  service_data?: object;
}

interface Config extends LovelaceConfig {
  show_name?: boolean;
  show_state?: boolean;
  title?: string;
  theme?: string;
  entities: EntityConfig[];
  columns?: number;
}

export class HuiGlanceCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;
  private _configEntities?: EntityConfig[];

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
    const entities = processConfigEntities(config.entities);

    for (const entity of entities) {
      if (
        (entity.tap_action === "call-service" ||
          entity.hold_action === "call-service") &&
        !entity.service
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

  public getElementConfig(config: any, hass: HomeAssistant): TemplateResult {
    if (!config || !hass) {
      return html``;
    }
    return html`
      <paper-input label="Title" value="${config.title}"></paper-input>
      ${config.entities.map((entityConf) => {
        return html`
          <ha-entity-picker
            hass="${hass}"
            value="${entityConf.entity || entityConf}"
            allow-custom-entity
          ></ha-entity-picker>
        `;
      })}
      <paper-checkbox ?checked="${config.show_name !==
        false}">Show Entity's Name?</paper-checkbox>
      <paper-checkbox ?checked="${config.show_state !==
        false}">Show Entity's state-text?</paper-checkbox>
    `;
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

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }
    const { title } = this._config;

    return html`
      ${this.renderStyle()}
      <ha-card .header="${title}">
        <div class="entities ${classMap({ "no-header": !title })}">
          ${this._configEntities!.map((entityConf) =>
            this.renderEntity(entityConf)
          )}
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProperties: PropertyValues): void {
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
      return html`<div class="entity not-found"><div class="name">${
        entityConf.entity
      }</div>Entity Not Available</div>`;
    }

    return html`
      <div
        class="entity"
        .entityConf="${entityConf}"
        @ha-click="${(ev) => this.handleClick(ev, false)}"
        @ha-hold="${(ev) => this.handleClick(ev, true)}"
        .longPress="${longPress()}"
      >
        ${
          this._config!.show_name !== false
            ? html`<div class="name">${
                "name" in entityConf
                  ? entityConf.name
                  : computeStateName(stateObj)
              }</div>`
            : ""
        }
        <state-badge
          .stateObj="${stateObj}"
          .overrideIcon="${entityConf.icon}"
        ></state-badge>
        ${
          this._config!.show_state !== false
            ? html`<div>${computeStateDisplay(this.localize, stateObj)}</div>`
            : ""
        }
      </div>
    `;
  }

  private handleClick(ev: MouseEvent, hold: boolean): void {
    const config = (ev.currentTarget as any).entityConf as EntityConfig;
    const entityId = config.entity;
    const action = hold ? config.hold_action : config.tap_action || "more-info";
    switch (action) {
      case "toggle":
        toggleEntity(this.hass, entityId);
        break;
      case "call-service":
        const [domain, service] = config.service!.split(".", 2);
        const serviceData = { entity_id: entityId, ...config.service_data };
        this.hass!.callService(domain, service, serviceData);
        break;
      case "more-info":
        fireEvent(this, "hass-more-info", { entityId });
        break;
      default:
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card": HuiGlanceCard;
  }
}

customElements.define("hui-glance-card", HuiGlanceCard);
