import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-tooltip/paper-tooltip";
import "@material/mwc-button";
import "@polymer/paper-fab/paper-fab";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-card";
import "../../../components/entity/ha-state-icon";
import "../../../layouts/hass-subpage";
import "../../../resources/ha-style";
import "../../../components/ha-icon-next";

import { computeRTL } from "../../../common/util/compute_rtl";
import "../ha-config-section";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import computeStateName from "../../../common/entity/compute_state_name";
import {
  loadConfigFlowDialog,
  showConfigFlowDialog,
} from "../../../dialogs/config-flow/show-dialog-config-flow";
import { localizeConfigFlowTitle } from "../../../data/config_flow";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaConfigManagerDashboard extends LocalizeMixin(
  EventsMixin(PolymerElement)
) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        ha-card {
          overflow: hidden;
        }
        mwc-button {
          top: 3px;
          margin-right: -0.57em;
        }
        .config-entry-row {
          display: flex;
          padding: 0 16px;
        }
        ha-state-icon {
          cursor: pointer;
        }
        .configured a {
          color: var(--primary-text-color);
          text-decoration: none;
        }
        paper-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }

        paper-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }

        paper-fab[rtl] {
          right: auto;
          left: 16px;
        }

        paper-fab[rtl][is-wide] {
          bottom: 24px;
          right: auto;
          left: 24px;
        }
      </style>

      <hass-subpage
        header="[[localize('ui.panel.config.integrations.caption')]]"
      >
        <template is="dom-if" if="[[progress.length]]">
          <ha-config-section>
            <span slot="header"
              >[[localize('ui.panel.config.integrations.discovered')]]</span
            >
            <ha-card>
              <template is="dom-repeat" items="[[progress]]">
                <div class="config-entry-row">
                  <paper-item-body>
                    [[_computeActiveFlowTitle(localize, item)]]
                  </paper-item-body>
                  <mwc-button on-click="_continueFlow"
                    >[[localize('ui.panel.config.integrations.configure')]]</mwc-button
                  >
                </div>
              </template>
            </ha-card>
          </ha-config-section>
        </template>

        <ha-config-section class="configured">
          <span slot="header"
            >[[localize('ui.panel.config.integrations.configured')]]</span
          >
          <ha-card>
            <template is="dom-if" if="[[!entries.length]]">
              <div class="config-entry-row">
                <paper-item-body two-line>
                  <div>[[localize('ui.panel.config.integrations.none')]]</div>
                </paper-item-body>
              </div>
            </template>
            <template is="dom-repeat" items="[[entries]]">
              <a href="/config/integrations/config_entry/[[item.entry_id]]">
                <paper-item>
                  <paper-item-body two-line>
                    <div>
                      [[_computeIntegrationTitle(localize, item.domain)]]:
                      [[item.title]]
                    </div>
                    <div secondary>
                      <template
                        is="dom-repeat"
                        items="[[_computeConfigEntryEntities(hass, item, entities)]]"
                      >
                        <span>
                          <ha-state-icon state-obj="[[item]]"></ha-state-icon>
                          <paper-tooltip position="bottom"
                            >[[_computeStateName(item)]]</paper-tooltip
                          >
                        </span>
                      </template>
                    </div>
                  </paper-item-body>
                  <ha-icon-next></ha-icon-next>
                </paper-item>
              </a>
            </template>
          </ha-card>
        </ha-config-section>

        <paper-fab
          icon="hass:plus"
          title="[[localize('ui.panel.config.integrations.new')]]"
          on-click="_createFlow"
          is-wide$="[[isWide]]"
          rtl$="[[rtl]]"
        ></paper-fab>
      </hass-subpage>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,

      /**
       * Existing entries.
       */
      entries: Array,

      /**
       * Entity Registry entries.
       */
      entities: Array,

      /**
       * Current flows that are in progress and have not been started by a user.
       * For example, can be discovered devices that require more config.
       */
      progress: Array,

      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    loadConfigFlowDialog();
  }

  _createFlow() {
    showConfigFlowDialog(this, {
      dialogClosedCallback: () => this.fire("hass-reload-entries"),
    });
  }

  _continueFlow(ev) {
    showConfigFlowDialog(this, {
      continueFlowId: ev.model.item.flow_id,
      dialogClosedCallback: () => this.fire("hass-reload-entries"),
    });
  }

  _computeIntegrationTitle(localize, integration) {
    return localize(`component.${integration}.config.title`);
  }

  _computeActiveFlowTitle(localize, flow) {
    return localizeConfigFlowTitle(localize, flow);
  }

  _computeConfigEntryEntities(hass, configEntry, entities) {
    if (!entities) {
      return [];
    }
    const states = [];
    entities.forEach((entity) => {
      if (
        entity.config_entry_id === configEntry.entry_id &&
        entity.entity_id in hass.states
      ) {
        states.push(hass.states[entity.entity_id]);
      }
    });
    return states;
  }

  _computeStateName(stateObj) {
    return computeStateName(stateObj);
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}

customElements.define("ha-config-entries-dashboard", HaConfigManagerDashboard);
