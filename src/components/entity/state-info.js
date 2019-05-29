import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../ha-relative-time";
import "./state-badge";
import computeStateName from "../../common/entity/compute_state_name";
import { computeRTL } from "../../common/util/compute_rtl";

class StateInfo extends PolymerElement {
  static get template() {
    return html`
      ${this.styleTemplate} ${this.stateBadgeTemplate} ${this.infoTemplate}
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        :host {
          @apply --paper-font-body1;
          min-width: 120px;
          white-space: nowrap;
        }

        state-badge {
          float: left;
        }

        :host([rtl]) state-badge {
          float: right;
        }

        .info {
          margin-left: 56px;
        }

        :host([rtl]) .info {
          margin-right: 56px;
          margin-left: 0;
          text-align: right;
        }

        .name {
          @apply --paper-font-common-nowrap;
          color: var(--primary-text-color);
          line-height: 40px;
        }

        .name[in-dialog],
        :host([secondary-line]) .name {
          line-height: 20px;
        }

        .time-ago,
        .extra-info,
        .extra-info > * {
          @apply --paper-font-common-nowrap;
          color: var(--secondary-text-color);
        }
      </style>
    `;
  }

  static get stateBadgeTemplate() {
    return html`
      <state-badge state-obj="[[stateObj]]"></state-badge>
    `;
  }

  static get infoTemplate() {
    return html`
      <div class="info">
        <div class="name" in-dialog$="[[inDialog]]">
          [[computeStateName(stateObj)]]
        </div>

        <template is="dom-if" if="[[inDialog]]">
          <div class="time-ago">
            <ha-relative-time
              hass="[[hass]]"
              datetime="[[stateObj.last_changed]]"
            ></ha-relative-time>
          </div>
        </template>
        <template is="dom-if" if="[[!inDialog]]">
          <div class="extra-info"><slot> </slot></div>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      inDialog: {
        type: Boolean,
        value: () => false,
      },
      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "computeRTL(hass)",
      },
    };
  }

  computeStateName(stateObj) {
    return computeStateName(stateObj);
  }

  computeRTL(hass) {
    return computeRTL(hass);
  }
}

customElements.define("state-info", StateInfo);
