import { html, LitElement } from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap.js";

import computeStateDisplay from "../../../common/entity/compute_state_display.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
import processConfigEntities from "../common/process-config-entities";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element.js";

import toggleEntity from "../common/entity/toggle-entity.js";

import "../../../components/entity/state-badge.js";
import "../../../components/ha-card.js";
import "../../../components/ha-icon.js";

import { fireEvent } from "../../../common/dom/fire_event.js";
import { HassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types.js";
import { LovelaceCard, LovelaceConfig } from "../types.js";

interface EntityConfig {
  name: string;
  icon: string;
  entity: string;
  tap_action: "toggle" | "call-service" | "more-info";
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

export class HuiGlanceCard extends HassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  protected hass?: HomeAssistant;
  protected config?: Config;
  protected configEntities?: EntityConfig[];

  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  public getCardSize() {
    return (this.config!.title ? 1 : 0) + Math.ceil(this.configEntities!.length / 5);
  }

  public setConfig(config: Config) {
    this.config = { theme: "default", ...config };
    const entities = processConfigEntities(config.entities);

    for (const entity of entities) {
      if (entity.tap_action === "call-service" && !entity.service) {
        throw new Error(
          'Missing required property "service" when tap_action is call-service'
        );
      }
    }

    const columns = config.columns || Math.min(config.entities.length, 5);
    this.style.setProperty("--glance-column-width", `${100 / columns}%`);

    this.configEntities = entities;

    if (this.hass) {
      this.requestUpdate();
    }
  }

  protected render() {
    if (!this.config || !this.hass) {
      return html``;
    }
    const { title } = this.config;

    applyThemesOnElement(this, this.hass!.themes, this.config.theme);

    return html`
      ${this.renderStyle()}
      <ha-card .header="${title}">
        <div class="entities ${classMap({ "no-header": !title })}">
          ${this.configEntities!.map(entityConf => this.renderEntity(entityConf))}
        </div>
      </ha-card>
    `;
  }

  private renderStyle() {
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

  private renderEntity(entityConf) {
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
        @click="${this.handleClick}"
      >
        ${
          this.config!.show_name !== false
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
          this.config!.show_state !== false
            ? html`<div>${computeStateDisplay(this.localize, stateObj)}</div>`
            : ""
        }
      </div>
    `;
  }

  private handleClick(ev: MouseEvent) {
    const config = (ev.currentTarget as any).entityConf as EntityConfig;
    const entityId = config.entity;
    switch (config.tap_action) {
      case "toggle":
        toggleEntity(this.hass, entityId);
        break;
      case "call-service": {
        const [domain, service] = config.service!.split(".", 2);
        const serviceData = { entity_id: entityId, ...config.service_data };
        this.hass!.callService(domain, service, serviceData);
        break;
      }
      default:
        fireEvent(this, "hass-more-info", { entityId });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card": HuiGlanceCard;
  }
}

customElements.define("hui-glance-card", HuiGlanceCard);
