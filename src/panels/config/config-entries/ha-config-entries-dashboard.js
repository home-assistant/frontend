import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-tooltip/paper-tooltip";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/entity/ha-state-icon";
import "../../../layouts/hass-subpage";
import "../../../resources/ha-style";

import "../ha-config-section";
import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import computeStateName from "../../../common/entity/compute_state_name";

let registeredDialog = false;

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
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          top: 3px;
          margin-right: -0.57em;
        }
        paper-card:last-child {
          margin-top: 12px;
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
      </style>

      <hass-subpage
        header="[[localize('ui.panel.config.integrations.caption')]]"
      >
        <template is="dom-if" if="[[progress.length]]">
          <ha-config-section>
            <span slot="header"
              >[[localize('ui.panel.config.integrations.discovered')]]</span
            >
            <paper-card>
              <template is="dom-repeat" items="[[progress]]">
                <div class="config-entry-row">
                  <paper-item-body>
                    [[_computeIntegrationTitle(localize, item.handler)]]
                  </paper-item-body>
                  <paper-button on-click="_continueFlow"
                    >[[localize('ui.panel.config.integrations.configure')]]</paper-button
                  >
                </div>
              </template>
            </paper-card>
          </ha-config-section>
        </template>

        <ha-config-section class="configured">
          <span slot="header"
            >[[localize('ui.panel.config.integrations.configured')]]</span
          >
          <paper-card>
            <template is="dom-if" if="[[!entries.length]]">
              <div class="config-entry-row">
                <paper-item-body two-line>
                  <div>[[localize('ui.panel.config.integrations.none')]]</div>
                </paper-item-body>
              </div>
            </template>
            <template is="dom-repeat" items="[[entries]]">
              <a href="/config/integrations/[[item.entry_id]]">
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
                          <ha-state-icon
                            state-obj="[[item]]"
                            on-click="_handleMoreInfo"
                          ></ha-state-icon>
                          <paper-tooltip position="bottom"
                            >[[_computeStateName(item)]]</paper-tooltip
                          >
                        </span>
                      </template>
                    </div>
                  </paper-item-body>
                  <iron-icon icon="hass:chevron-right"></iron-icon>
                </paper-item>
              </a>
            </template>
          </paper-card>
        </ha-config-section>

        <ha-config-section>
          <span slot="header"
            >[[localize('ui.panel.config.integrations.new')]]</span
          >
          <paper-card>
            <template is="dom-repeat" items="[[handlers]]">
              <div class="config-entry-row">
                <paper-item-body>
                  [[_computeIntegrationTitle(localize, item)]]
                </paper-item-body>
                <paper-button on-click="_createFlow"
                  >[[localize('ui.panel.config.integrations.configure')]]</paper-button
                >
              </div>
            </template>
          </paper-card>
        </ha-config-section>
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

      handlers: Array,
    };
  }

  connectedCallback() {
    super.connectedCallback();

    if (!registeredDialog) {
      registeredDialog = true;
      this.fire("register-dialog", {
        dialogShowEvent: "show-config-flow",
        dialogTag: "ha-config-flow",
        dialogImport: () =>
          import(/* webpackChunkName: "ha-config-flow" */ "./ha-config-flow"),
      });
    }
  }

  _createFlow(ev) {
    this.fire("show-config-flow", {
      hass: this.hass,
      newFlowForHandler: ev.model.item,
      dialogClosedCallback: () => this.fire("hass-reload-entries"),
    });
  }

  _continueFlow(ev) {
    this.fire("show-config-flow", {
      hass: this.hass,
      continueFlowId: ev.model.item.flow_id,
      dialogClosedCallback: () => this.fire("hass-reload-entries"),
    });
  }

  _computeIntegrationTitle(localize, integration) {
    return localize(`component.${integration}.config.title`);
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

  _handleMoreInfo(ev) {
    this.fire("hass-more-info", { entityId: ev.model.item.entity_id });
  }
}

customElements.define("ha-config-entries-dashboard", HaConfigManagerDashboard);
