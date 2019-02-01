import "../../../components/entity/state-badge";
import "../../../components/ha-relative-time";
import "../../../components/ha-icon";

import computeStateName from "../../../common/entity/compute_state_name";
import {
  LitElement,
  PropertyDeclarations,
  html,
  css,
  CSSResult,
  PropertyValues,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/hui-entities-card";
import { computeRTL } from "../../../common/util/compute_rtl";

class HuiGenericEntityRow extends LitElement {
  public hass?: HomeAssistant;
  public config?: EntitiesCardEntityConfig;
  public showSecondary: boolean;

  constructor() {
    super();
    this.showSecondary = true;
  }

  protected render() {
    if (!this.hass || !this.config) {
      return html``;
    }
    const stateObj = this.config.entity
      ? this.hass.states[this.config.entity]
      : undefined;

    if (!stateObj) {
      return html`
        <div class="not-found">Entity not available: [[config.entity]]</div>
      `;
    }

    return html`
      <state-badge
        .stateObj="${stateObj}"
        .overrideIcon="${this.config.icon}"
      ></state-badge>
      <div class="flex">
        <div class="info">
          ${this.config.name || computeStateName(stateObj)}
          <div class="secondary">
            ${!this.showSecondary
              ? html`
                  <slot name="secondary"></slot>
                `
              : this.config.secondary_info === "entity-id"
              ? stateObj.entity_id
              : this.config.secondary_info === "last-changed"
              ? html`
                  <ha-relative-time
                    .hass="${this.hass}"
                    .datetime="${stateObj.last_changed}"
                  ></ha-relative-time>
                `
              : ""}
          </div>
        </div>

        <slot></slot>
      </div>
    `;
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      config: {},
      showSecondary: {},
    };
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("hass")) {
      this.toggleAttribute("rtl", computeRTL(this.hass!));
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        align-items: center;
      }
      .flex {
        flex: 1;
        margin-left: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 0;
      }
      .info {
        flex: 1 0 60px;
      }
      .info,
      .info > * {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .flex ::slotted(*) {
        margin-left: 8px;
        min-width: 0;
      }
      .flex ::slotted([slot="secondary"]) {
        margin-left: 0;
      }
      .secondary,
      ha-relative-time {
        display: block;
        color: var(--secondary-text-color);
      }
      .not-found {
        flex: 1;
        background-color: yellow;
        padding: 8px;
      }
      state-badge {
        flex: 0 0 40px;
      }
      :host([rtl]) .flex {
        margin-left: 0;
        margin-right: 16px;
      }
      :host([rtl]) .flex ::slotted(*) {
        margin-left: 0;
        margin-right: 8px;
      }
    `;
  }
}
customElements.define("hui-generic-entity-row", HuiGenericEntityRow);
