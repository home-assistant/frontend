import { html } from "@polymer/polymer/lib/utils/html-tag";
import "@polymer/paper-tooltip/paper-tooltip";
/* eslint-plugin-disable lit */
import LocalizeMixin from "../../mixins/localize-mixin";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { computeStateName } from "../../common/entity/compute_state_name";
import { computeRTL } from "../../common/util/compute_rtl";
import "../ha-relative-time";
import "./state-badge";

class StateInfo extends LocalizeMixin(PolymerElement) {
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

        .row {
          display: flex;
          flex-direction: row;
          flex-wrap: no-wrap;
          width: 100%;
          justify-content: space-between;
          margin: 0 2px 4px 0;
        }

        .row:last-child {
          margin-bottom: 0px;
        }
      </style>
    `;
  }

  static get stateBadgeTemplate() {
    return html` <state-badge state-obj="[[stateObj]]"></state-badge> `;
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
              id="last_changed"
              hass="[[hass]]"
              datetime="[[stateObj.last_changed]]"
            ></ha-relative-time>
            <paper-tooltip animation-delay="0" for="last_changed">
              <div>
                <div class="row">
                  <span class="column-name">
                    [[localize('ui.dialogs.more_info_control.last_changed')]]:
                  </span>
                  <ha-relative-time
                    hass="[[hass]]"
                    datetime="[[stateObj.last_changed]]"
                  ></ha-relative-time>
                </div>
                <div class="row">
                  <span>
                    [[localize('ui.dialogs.more_info_control.last_updated')]]:
                  </span>
                  <ha-relative-time
                    hass="[[hass]]"
                    datetime="[[stateObj.last_updated]]"
                  ></ha-relative-time>
                </div>
              </div>
            </paper-tooltip>
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
