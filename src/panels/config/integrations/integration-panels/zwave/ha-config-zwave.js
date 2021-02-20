import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { computeStateDomain } from "../../../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import { sortStatesByName } from "../../../../../common/entity/states_sort_by_name";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-button-arrow-prev";
import "../../../../../components/ha-menu-button";
import "../../../../../components/ha-service-description";
import "../../../../../layouts/ha-app-layout";
import { EventsMixin } from "../../../../../mixins/events-mixin";
import LocalizeMixin from "../../../../../mixins/localize-mixin";
import "../../../../../styles/polymer-ha-style";
import "../../../ha-config-section";
import "../../../ha-form-style";
import "./zwave-groups";
import "./zwave-log";
import "./zwave-network";
import "./zwave-node-config";
import "./zwave-node-protection";
import "./zwave-usercodes";
import "./zwave-values";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaConfigZwave extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex ha-style ha-form-style">
        app-toolbar {
          border-bottom: 1px solid var(--divider-color);
        }

        .content {
          margin-top: 24px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
        }

        .node-info {
          margin-left: 16px;
        }

        .help-text {
          padding-left: 24px;
          padding-right: 24px;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        .device-picker {
          @apply --layout-horizontal;
          @apply --layout-center-center;
          padding-left: 24px;
          padding-right: 24px;
          padding-bottom: 24px;
        }

        ha-service-description {
          display: block;
          color: grey;
        }

        ha-service-description[hidden] {
          display: none;
        }

        .toggle-help-icon {
          position: absolute;
          top: -6px;
          right: 0;
          color: var(--primary-color);
        }
      </style>
      <ha-app-layout>
        <app-header slot="header" fixed="">
          <app-toolbar>
            <ha-icon-button-arrow-prev
              hass="[[hass]]"
              on-click="_backTapped"
            ></ha-icon-button-arrow-prev>
            <div main-title="">
              [[localize('component.zwave.title')]]
            </div>
          </app-toolbar>
        </app-header>

        <ha-config-section is-wide="[[isWide]]">
          <ha-card
            class="content"
            header="[[localize('ui.panel.config.zwave.migration.ozw.header')]]"
          >
            <div class="card-content">
              <p>
                If you are experiencing problems with your Z-Wave devices, you
                can migrate to the newer OZW integration, that is currently in
                beta.
              </p>
              <p>
                Be aware that the future of OZW is not guaranteed, as the
                development has stopped.
              </p>
              <p>
                If you are currently not experiencing issues with your Z-Wave
                devices, we recommend you to wait for the successor of the OZW
                integration, Z-Wave JS, that is in active development at the
                moment.
              </p>
            </div>
            <div class="card-actions">
              <a href="/config/zwave/migration"
                ><mwc-button>Start Migration to OZW</mwc-button></a
              >
            </div>
          </ha-card>
        </ha-config-section>

        <zwave-network
          id="zwave-network"
          is-wide="[[isWide]]"
          hass="[[hass]]"
        ></zwave-network>

        <!-- Node card -->
        <ha-config-section is-wide="[[isWide]]">
          <div class="sectionHeader" slot="header">
            <span
              >[[localize('ui.panel.config.zwave.node_management.header')]]</span
            >
            <ha-icon-button
              class="toggle-help-icon"
              on-click="toggleHelp"
              icon="hass:help-circle"
            ></ha-icon-button>
          </div>
          <span slot="introduction">
            [[localize('ui.panel.config.zwave.node_management.introduction')]]
          </span>

          <ha-card class="content">
            <div class="device-picker">
              <paper-dropdown-menu
                dynamic-align=""
                label="[[localize('ui.panel.config.zwave.node_management.nodes')]]"
                class="flex"
              >
                <paper-listbox
                  slot="dropdown-content"
                  selected="{{selectedNode}}"
                >
                  <template is="dom-repeat" items="[[nodes]]" as="state">
                    <paper-item>[[computeSelectCaption(state)]]</paper-item>
                  </template>
                </paper-listbox>
              </paper-dropdown-menu>
            </div>
            <template is="dom-if" if="[[!computeIsNodeSelected(selectedNode)]]">
              <template is="dom-if" if="[[showHelp]]">
                <div style="color: grey; padding: 12px">
                  [[localize('ui.panel.config.zwave.node_management.introduction')]]
                </div>
              </template>
            </template>

            <template is="dom-if" if="[[computeIsNodeSelected(selectedNode)]]">
              <div class="card-actions">
                <ha-call-service-button
                  hass="[[hass]]"
                  domain="zwave"
                  service="refresh_node"
                  service-data="[[computeNodeServiceData(selectedNode)]]"
                >
                  [[localize('ui.panel.config.zwave.services.refresh_node')]]
                </ha-call-service-button>
                <ha-service-description
                  hass="[[hass]]"
                  domain="zwave"
                  service="refresh_node"
                  hidden$="[[!showHelp]]"
                >
                </ha-service-description>

                <template is="dom-if" if="[[nodeFailed]]">
                  <ha-call-service-button
                    hass="[[hass]]"
                    domain="zwave"
                    service="remove_failed_node"
                    service-data="[[computeNodeServiceData(selectedNode)]]"
                  >
                    [[localize('ui.panel.config.zwave.services.remove_failed_node')]]
                  </ha-call-service-button>
                  <ha-service-description
                    hass="[[hass]]"
                    domain="zwave"
                    service="remove_failed_node"
                    hidden$="[[!showHelp]]"
                  >
                  </ha-service-description>

                  <ha-call-service-button
                    hass="[[hass]]"
                    domain="zwave"
                    service="replace_failed_node"
                    service-data="[[computeNodeServiceData(selectedNode)]]"
                  >
                    [[localize('ui.panel.config.zwave.services.replace_failed_node')]]
                  </ha-call-service-button>
                  <ha-service-description
                    hass="[[hass]]"
                    domain="zwave"
                    service="replace_failed_node"
                    hidden$="[[!showHelp]]"
                  >
                  </ha-service-description>
                </template>

                <ha-call-service-button
                  hass="[[hass]]"
                  domain="zwave"
                  service="print_node"
                  service-data="[[computeNodeServiceData(selectedNode)]]"
                >
                  [[localize('ui.panel.config.zwave.services.print_node')]]
                </ha-call-service-button>
                <ha-service-description
                  hass="[[hass]]"
                  domain="zwave"
                  service="print_node"
                  hidden$="[[!showHelp]]"
                >
                </ha-service-description>

                <ha-call-service-button
                  hass="[[hass]]"
                  domain="zwave"
                  service="heal_node"
                  service-data="[[computeHealNodeServiceData(selectedNode)]]"
                >
                  [[localize('ui.panel.config.zwave.services.heal_node')]]
                </ha-call-service-button>
                <ha-service-description
                  hass="[[hass]]"
                  domain="zwave"
                  service="heal_node"
                  hidden$="[[!showHelp]]"
                >
                </ha-service-description>

                <ha-call-service-button
                  hass="[[hass]]"
                  domain="zwave"
                  service="test_node"
                  service-data="[[computeNodeServiceData(selectedNode)]]"
                >
                  [[localize('ui.panel.config.zwave.services.test_node')]]
                </ha-call-service-button>
                <ha-service-description
                  hass="[[hass]]"
                  domain="zwave"
                  service="test_node"
                  hidden$="[[!showHelp]]"
                >
                </ha-service-description>
                <mwc-button on-click="_nodeMoreInfo"
                  >[[localize('ui.panel.config.zwave.services.node_info')]]</mwc-button
                >
              </div>

              <div class="device-picker">
                <paper-dropdown-menu
                  label="[[localize('ui.panel.config.zwave.node_management.entities')]]"
                  dynamic-align=""
                  class="flex"
                >
                  <paper-listbox
                    slot="dropdown-content"
                    selected="{{selectedEntity}}"
                  >
                    <template is="dom-repeat" items="[[entities]]" as="state">
                      <paper-item>[[state.entity_id]]</paper-item>
                    </template>
                  </paper-listbox>
                </paper-dropdown-menu>
              </div>
              <template
                is="dom-if"
                if="[[!computeIsEntitySelected(selectedEntity)]]"
              >
                <div class="card-actions">
                  <ha-call-service-button
                    hass="[[hass]]"
                    domain="zwave"
                    service="refresh_entity"
                    service-data="[[computeRefreshEntityServiceData(selectedEntity)]]"
                  >
                    [[localize('ui.panel.config.zwave.services.refresh_entity')]]
                  </ha-call-service-button>
                  <ha-service-description
                    hass="[[hass]]"
                    domain="zwave"
                    service="refresh_entity"
                    hidden$="[[!showHelp]]"
                  >
                  </ha-service-description>
                  <mwc-button on-click="_entityMoreInfo"
                    >[[localize('ui.panel.config.zwave.node_management.entity_info')]]</mwc-button
                  >
                </div>
                <div class="form-group">
                  <paper-checkbox
                    checked="{{entityIgnored}}"
                    class="form-control"
                  >
                    [[localize('ui.panel.config.zwave.node_management.exclude_entity')]]
                  </paper-checkbox>
                  <paper-input
                    disabled="{{entityIgnored}}"
                    label="[[localize('ui.panel.config.zwave.node_management.pooling_intensity')]]"
                    type="number"
                    min="0"
                    value="{{entityPollingIntensity}}"
                  >
                  </paper-input>
                </div>
                <div class="card-actions">
                  <ha-call-service-button
                    hass="[[hass]]"
                    domain="zwave"
                    service="set_poll_intensity"
                    service-data="[[computePollIntensityServiceData(entityPollingIntensity)]]"
                  >
                    [[localize('ui.common.save')]]
                  </ha-call-service-button>
                </div>
              </template>
            </template>
          </ha-card>

          <template is="dom-if" if="[[computeIsNodeSelected(selectedNode)]]">
            <!-- Value card -->
            <zwave-values
              hass="[[hass]]"
              nodes="[[nodes]]"
              selected-node="[[selectedNode]]"
              values="[[values]]"
            ></zwave-values>

            <!-- Group card -->
            <zwave-groups
              hass="[[hass]]"
              nodes="[[nodes]]"
              selected-node="[[selectedNode]]"
              groups="[[groups]]"
            ></zwave-groups>

            <!-- Config card -->
            <zwave-node-config
              hass="[[hass]]"
              nodes="[[nodes]]"
              selected-node="[[selectedNode]]"
              config="[[config]]"
            ></zwave-node-config>
          </template>

          <!-- Protection card -->
          <template is="dom-if" if="{{_protectionNode}}">
            <zwave-node-protection
              hass="[[hass]]"
              nodes="[[nodes]]"
              selected-node="[[selectedNode]]"
              protection="[[_protection]]"
            ></zwave-node-protection>
          </template>

          <!-- User Codes -->
          <template is="dom-if" if="{{hasNodeUserCodes}}">
            <zwave-usercodes
              id="zwave-usercodes"
              hass="[[hass]]"
              nodes="[[nodes]]"
              user-codes="[[userCodes]]"
              selected-node="[[selectedNode]]"
            ></zwave-usercodes>
          </template>
        </ha-config-section>

        <!-- Ozw log -->
        <ozw-log is-wide="[[isWide]]" hass="[[hass]]"></ozw-log>
      </ha-app-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      isWide: Boolean,

      nodes: {
        type: Array,
        computed: "computeNodes(hass)",
      },

      selectedNode: {
        type: Number,
        value: -1,
        observer: "selectedNodeChanged",
      },

      nodeFailed: {
        type: Boolean,
        value: false,
      },

      config: {
        type: Array,
        value: () => [],
      },

      entities: {
        type: Array,
        computed: "computeEntities(selectedNode)",
      },

      selectedEntity: {
        type: Number,
        value: -1,
        observer: "selectedEntityChanged",
      },

      values: {
        type: Array,
      },

      groups: {
        type: Array,
      },

      userCodes: {
        type: Array,
        value: () => [],
      },

      hasNodeUserCodes: {
        type: Boolean,
        value: false,
      },

      showHelp: {
        type: Boolean,
        value: false,
      },

      entityIgnored: Boolean,

      entityPollingIntensity: {
        type: Number,
        value: 0,
      },

      _protection: {
        type: Array,
        value: () => [],
      },

      _protectionNode: {
        type: Boolean,
        value: false,
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener("hass-service-called", (ev) =>
      this.serviceCalled(ev)
    );
  }

  serviceCalled(ev) {
    if (ev.detail.success && ev.detail.service === "set_poll_intensity") {
      this._saveEntity();
    }
  }

  computeNodes(hass) {
    return Object.keys(hass.states)
      .map((key) => hass.states[key])
      .filter((ent) => ent.entity_id.match("zwave[.]"))
      .sort(sortStatesByName);
  }

  computeEntities(selectedNode) {
    if (!this.nodes || selectedNode === -1) return -1;
    const nodeid = this.nodes[this.selectedNode].attributes.node_id;
    const hass = this.hass;
    return Object.keys(this.hass.states)
      .map((key) => hass.states[key])
      .filter((ent) => {
        if (ent.attributes.node_id === undefined) {
          return false;
        }
        return (
          "node_id" in ent.attributes &&
          ent.attributes.node_id === nodeid &&
          !ent.entity_id.match("zwave[.]")
        );
      })
      .sort(sortStatesByName);
  }

  selectedNodeChanged(selectedNode) {
    if (selectedNode === -1) return;
    this.selectedEntity = -1;

    this.hass
      .callApi(
        "GET",
        `zwave/config/${this.nodes[selectedNode].attributes.node_id}`
      )
      .then((configs) => {
        this.config = this._objToArray(configs);
      });

    this.hass
      .callApi(
        "GET",
        `zwave/values/${this.nodes[selectedNode].attributes.node_id}`
      )
      .then((values) => {
        this.values = this._objToArray(values);
      });

    this.hass
      .callApi(
        "GET",
        `zwave/groups/${this.nodes[selectedNode].attributes.node_id}`
      )
      .then((groups) => {
        this.groups = this._objToArray(groups);
      });

    this.hasNodeUserCodes = false;
    this.notifyPath("hasNodeUserCodes");
    this.hass
      .callApi(
        "GET",
        `zwave/usercodes/${this.nodes[selectedNode].attributes.node_id}`
      )
      .then((usercodes) => {
        this.userCodes = this._objToArray(usercodes);
        this.hasNodeUserCodes = this.userCodes.length > 0;
        this.notifyPath("hasNodeUserCodes");
      });
    this.hass
      .callApi(
        "GET",
        `zwave/protection/${this.nodes[selectedNode].attributes.node_id}`
      )
      .then((protections) => {
        this._protection = this._objToArray(protections);
        if (this._protection) {
          if (this._protection.length === 0) {
            return;
          }
          this._protectionNode = true;
        }
      });

    this.nodeFailed = this.nodes[selectedNode].attributes.is_failed;
  }

  selectedEntityChanged(selectedEntity) {
    if (selectedEntity === -1) return;
    this.hass
      .callApi(
        "GET",
        `zwave/values/${this.nodes[this.selectedNode].attributes.node_id}`
      )
      .then((values) => {
        this.values = this._objToArray(values);
      });

    const valueId = this.entities[selectedEntity].attributes.value_id;
    const valueData = this.values.find((obj) => obj.key === valueId);
    const valueIndex = this.values.indexOf(valueData);
    this.hass
      .callApi(
        "GET",
        `config/zwave/device_config/${this.entities[selectedEntity].entity_id}`
      )
      .then((data) => {
        this.setProperties({
          entityIgnored: data.ignored || false,
          entityPollingIntensity: this.values[valueIndex].value.poll_intensity,
        });
      })
      .catch(() => {
        this.setProperties({
          entityIgnored: false,
          entityPollingIntensity: this.values[valueIndex].value.poll_intensity,
        });
      });
  }

  computeSelectCaption(stateObj) {
    return (
      computeStateName(stateObj) +
      " (Node:" +
      stateObj.attributes.node_id +
      " " +
      stateObj.attributes.query_stage +
      ")"
    );
  }

  computeSelectCaptionEnt(stateObj) {
    return computeStateDomain(stateObj) + "." + computeStateName(stateObj);
  }

  computeIsNodeSelected() {
    return this.nodes && this.selectedNode !== -1;
  }

  computeIsEntitySelected(selectedEntity) {
    return selectedEntity === -1;
  }

  computeNodeServiceData(selectedNode) {
    return { node_id: this.nodes[selectedNode].attributes.node_id };
  }

  computeHealNodeServiceData(selectedNode) {
    return {
      node_id: this.nodes[selectedNode].attributes.node_id,
      return_routes: true,
    };
  }

  computeRefreshEntityServiceData(selectedEntity) {
    if (selectedEntity === -1) return -1;
    return { entity_id: this.entities[selectedEntity].entity_id };
  }

  computePollIntensityServiceData(entityPollingIntensity) {
    if (!this.selectedNode === -1 || this.selectedEntity === -1) return -1;
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      value_id: this.entities[this.selectedEntity].attributes.value_id,
      poll_intensity: parseInt(entityPollingIntensity),
    };
  }

  _nodeMoreInfo() {
    this.fire("hass-more-info", {
      entityId: this.nodes[this.selectedNode].entity_id,
    });
  }

  _entityMoreInfo() {
    this.fire("hass-more-info", {
      entityId: this.entities[this.selectedEntity].entity_id,
    });
  }

  _saveEntity() {
    const data = {
      ignored: this.entityIgnored,
      polling_intensity: parseInt(this.entityPollingIntensity),
    };
    return this.hass.callApi(
      "POST",
      `config/zwave/device_config/${
        this.entities[this.selectedEntity].entity_id
      }`,
      data
    );
  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  _objToArray(obj) {
    const array = [];
    Object.keys(obj).forEach((key) => {
      array.push({
        key,
        value: obj[key],
      });
    });
    return array;
  }

  _backTapped() {
    history.back();
  }
}

customElements.define("ha-config-zwave", HaConfigZwave);
