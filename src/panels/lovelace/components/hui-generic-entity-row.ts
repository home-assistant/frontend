import computeStateName from "../../../common/entity/compute_state_name";
import {
  LitElement,
  html,
  css,
  CSSResult,
  PropertyValues,
  property,
} from "lit-element";

import { HomeAssistant } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/hui-entities-card";
import { computeRTL } from "../../../common/util/compute_rtl";

import "../../../components/entity/state-badge";
import "../../../components/ha-relative-time";
import "../../../components/ha-icon";
import "../components/hui-warning";

class HuiGenericEntityRow extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public config?: EntitiesCardEntityConfig;
  @property() public showSecondary: boolean = true;

  protected render() {
    if (!this.hass || !this.config) {
      return html``;
    }
    const stateObj = this.config.entity
      ? this.hass.states[this.config.entity]
      : undefined;

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this.config.entity
          )}</hui-warning
        >
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
