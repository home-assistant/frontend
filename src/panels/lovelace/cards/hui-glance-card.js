import { LitElement, html } from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap.js";
import { repeat } from "lit-html/directives/repeat";

import computeStateDisplay from "../../../common/entity/compute_state_display.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
import processConfigEntities from "../common/process-config-entities";

import toggleEntity from "../common/entity/toggle-entity.js";

import "../../../components/entity/state-badge.js";
import "../../../components/ha-card.js";
import "../../../components/ha-icon.js";

import EventsMixin from "../../../mixins/events-mixin.js";
import LocalizeMixin from "../../../mixins/localize-mixin.js";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HuiGlanceCard extends LocalizeMixin(EventsMixin(LitElement)) {
  renderStyle() {
    return html`
      <style>
        :host(.theme-primary) {
          --paper-card-background-color:var(--primary-color);
          --paper-item-icon-color:var(--text-primary-color);
          color:var(--text-primary-color);
        }
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
      </style>
    `;
  }

  renderEntity(entityConf) {
    if (!this._config) return html``;
    const stateObj = this.hass.states[entityConf.entity];

    return html`
      <div class="entity" .entityConf="${entityConf}" @click="${
      this._handleClick
    }">
        ${
          this._config.show_name !== false
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
          this._config.show_state !== false
            ? html`<div>${computeStateDisplay(this.localize, stateObj)}</div>`
            : ""
        }
      </div>
    `;
  }

  render() {
    const { title } = this._config;
    const states = this.hass.states;
    const entities = this._configEntities.filter(
      (conf) => conf.entity in states
    );

    return html`
      ${this.renderStyle()}
      <ha-card .header="${title}">
        <div class="entities ${classMap({ "no-header": !title })}">
        ${repeat(
          entities,
          (entityConf) => entityConf.entity,
          (entityConf) => this.renderEntity(entityConf)
        )}
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: {},
    };
  }

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    this._config = config;
    this.updateStyles({
      "--glance-column-width": (config && config.column_width) || "20%",
    });

    if (config && config.theming) {
      if (typeof config.theming !== "string") {
        throw new Error("Incorrect theming config.");
      }
      this.classList.add(`theme-${config.theming}`);
    }

    this._configEntities = processConfigEntities(config.entities);
    if (this.hass) {
      this.requestUpdate();
    }
  }

  _handleClick(ev) {
    const config = ev.currentTarget.entityConf;
    const entityId = config.entity;
    switch (config.tap_action) {
      case "toggle":
        toggleEntity(this.hass, entityId);
        break;
      case "call-service": {
        const [domain, service] = config.service.split(".", 2);
        const serviceData = Object.assign(
          {},
          { entity_id: entityId },
          config.service_data
        );
        this.hass.callService(domain, service, serviceData);
        break;
      }
      default:
        this.fire("hass-more-info", { entityId });
    }
  }
}

customElements.define("hui-glance-card", HuiGlanceCard);
