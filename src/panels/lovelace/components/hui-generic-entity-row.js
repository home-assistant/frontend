import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/entity/state-badge";
import "../../../components/ha-relative-time";
import "../../../components/ha-icon";

import computeStateName from "../../../common/entity/compute_state_name";

class HuiGenericEntityRow extends PolymerElement {
  static get template() {
    return html`
      ${this.styleTemplate}
      <template is="dom-if" if="[[_stateObj]]">
        ${this.stateBadgeTemplate}
        <div class="flex">${this.infoTemplate} <slot></slot></div>
      </template>
      <template is="dom-if" if="[[!_stateObj]]">
        <div class="not-found">Entity not available: [[config.entity]]</div>
      </template>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
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
      </style>
    `;
  }

  static get stateBadgeTemplate() {
    return html`
      <state-badge
        state-obj="[[_stateObj]]"
        override-icon="[[config.icon]]"
      ></state-badge>
    `;
  }

  static get infoTemplate() {
    return html`
      <div class="info">
        [[_computeName(config.name, _stateObj)]]
        <div class="secondary">
          <template is="dom-if" if="[[showSecondary]]">
            <template
              is="dom-if"
              if="[[_equals(config.secondary_info, 'entity-id')]]"
            >
              [[_stateObj.entity_id]]
            </template>
            <template
              is="dom-if"
              if="[[_equals(config.secondary_info, 'last-changed')]]"
            >
              <ha-relative-time
                hass="[[hass]]"
                datetime="[[_stateObj.last_changed]]"
              ></ha-relative-time>
            </template>
          </template>
          <template is="dom-if" if="[[!showSecondary]">
            <slot name="secondary"></slot>
          </template>
        </div>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      config: Object,
      _stateObj: {
        type: Object,
        computed: "_computeStateObj(hass.states, config.entity)",
      },
      showSecondary: {
        type: Boolean,
        value: true,
      },
    };
  }

  _equals(a, b) {
    return a === b;
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  _computeName(name, stateObj) {
    return name || computeStateName(stateObj);
  }
}
customElements.define("hui-generic-entity-row", HuiGenericEntityRow);
