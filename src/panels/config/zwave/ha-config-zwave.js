import "@polymer/app-layout/app-header/app-header.js";
import "@polymer/app-layout/app-toolbar/app-toolbar.js";
import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-input/paper-input.js";
import "@polymer/paper-item/paper-item.js";
import "@polymer/paper-listbox/paper-listbox.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/buttons/ha-call-service-button.js";
import "../../../components/ha-menu-button.js";
import "../../../components/ha-service-description.js";
import "../../../layouts/ha-app-layout.js";
import "../../../resources/ha-style.js";

import "../ha-config-section.js";
import "../ha-form-style.js";
import "./zwave-groups.js";
import "./zwave-log.js";
import "./zwave-network.js";
import "./zwave-node-config.js";
import "./zwave-usercodes.js";
import "./zwave-values.js";
import "./zwave-node-protection.js";

import sortByName from "../../../common/entity/states_sort_by_name.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
import computeStateDomain from "../../../common/entity/compute_state_domain.js";
import EventsMixin from "../../../mixins/events-mixin.js";
import LocalizeMixin from "../../../mixins/localize-mixin.js";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaConfigZwave extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="iron-flex ha-style ha-form-style">
      .content {
        margin-top: 24px;
      }

      .node-info {
        margin-left: 16px;
      }

      .help-text {
        padding-left: 24px;
        padding-right: 24px;
      }

      paper-card {
        display: block;
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

      [hidden] {
        display: none;
      }

      .toggle-help-icon {
        position: absolute;
        top: 6px;
        right: 0;
        color: var(--primary-color);
      }
    </style>
    <ha-app-layout has-scrolling-region="">
      <app-header slot="header" fixed="">
        <app-toolbar>
          <paper-icon-button icon="hass:arrow-left" on-click="_backTapped"></paper-icon-button>
          <div main-title="">[[localize('ui.panel.config.zwave.caption')]]</div>
        </app-toolbar>
      </app-header>

      <zwave-network id="zwave-network" is-wide="[[isWide]]" hass="[[hass]]"></zwave-network>

      <!--Node card-->
      <ha-config-section is-wide="[[isWide]]">
        <div style="position: relative" slot="header">
          <span>Z-Wave Node Management</span>
          <paper-icon-button class="toggle-help-icon" on-click="toggleHelp" icon="hass:help-circle"></paper-icon-button>

        </div>
        <span slot="introduction">
          Run Z-Wave commands that affect a single node. Pick a node to see a list of available commands.
        </span>

        <paper-card class="content">
          <div class="device-picker">
            <paper-dropdown-menu dynamic-align="" label="Nodes" class="flex">
              <paper-listbox slot="dropdown-content" selected="{{selectedNode}}">
                <template is="dom-repeat" items="[[nodes]]" as="state">
                  <paper-item>[[computeSelectCaption(state)]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
            <template is="dom-if" if="[[!computeIsNodeSelected(selectedNode)]]">
              <template is="dom-if" if="[[showHelp]]">
                <div style="color: grey; padding: 12px">Select node to view per-node options</div>
              </template>
            </template>

          <template is="dom-if" if="[[computeIsNodeSelected(selectedNode)]]">
          <div class="card-actions">
            <ha-call-service-button
              hass="[[hass]]"
              domain="zwave"
              service="refresh_node"
              service-data="[[computeNodeServiceData(selectedNode)]]">
              Refresh Node
            </ha-call-service-button>
            <ha-service-description
              hass="[[hass]]"
              domain="zwave"
              service="refresh_node"
              hidden$="[[!showHelp]]">
            </ha-service-description>

            <template is="dom-if" if="[[nodeFailed]]">
            <ha-call-service-button
              hass="[[hass]]"
              domain="zwave"
              service="remove_failed_node"
              service-data="[[computeNodeServiceData(selectedNode)]]">
              Remove Failed Node
            </ha-call-service-button>
            <ha-service-description
              hass="[[hass]]"
              domain="zwave"
              service="remove_failed_node"
              hidden$="[[!showHelp]]">
            </ha-service-description>

            <ha-call-service-button
              hass="[[hass]]"
              domain="zwave"
              service="replace_failed_node"
              service-data="[[computeNodeServiceData(selectedNode)]]">
              Replace Failed Node
            </ha-call-service-button>
            <ha-service-description
              hass="[[hass]]"
              domain="zwave"
              service="replace_failed_node"
              hidden$="[[!showHelp]]">
            </ha-service-description>
            </template>

            <ha-call-service-button
              hass="[[hass]]"
              domain="zwave"
              service="print_node"
              service-data="[[computeNodeServiceData(selectedNode)]]">
              Print Node
            </ha-call-service-button>
            <ha-service-description
              hass="[[hass]]"
              domain="zwave"
              service="print_node"
              hidden$="[[!showHelp]]">
            </ha-service-description>

            <ha-call-service-button
              hass="[[hass]]"
              domain="zwave"
              service="heal_node"
              service-data="[[computeHealNodeServiceData(selectedNode)]]">
              Heal Node
            </ha-call-service-button>
            <ha-service-description
              hass="[[hass]]"
              domain="zwave"
              service="heal_node"
              hidden$="[[!showHelp]]">
            </ha-service-description>

            <ha-call-service-button
              hass="[[hass]]"
              domain="zwave"
              service="test_node"
              service-data="[[computeNodeServiceData(selectedNode)]]">
              Test Node
            </ha-call-service-button>
            <ha-service-description
              hass="[[hass]]"
              domain="zwave"
              service="test_node"
              hidden$="[[!showHelp]]">
            </ha-service-description>
            <paper-button on-click="_nodeMoreInfo">Node Information</paper-button>
          </div>

           <div class="device-picker">
            <paper-dropdown-menu label="Entities of this node" dynamic-align="" class="flex">
              <paper-listbox slot="dropdown-content" selected="{{selectedEntity}}">
                <template is="dom-repeat" items="[[entities]]" as="state">
                  <paper-item>[[state.entity_id]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
           </div>
           <template is="dom-if" if="[[!computeIsEntitySelected(selectedEntity)]]">
           <div class="card-actions">
             <ha-call-service-button
               hass="[[hass]]"
               domain="zwave"
               service="refresh_entity"
               service-data="[[computeRefreshEntityServiceData(selectedEntity)]]">
               Refresh Entity
             </ha-call-service-button>
             <ha-service-description
               hass="[[hass]]"
               domain="zwave"
               service="refresh_entity"
               hidden$="[[!showHelp]]">
             </ha-service-description>
             <paper-button on-click="_entityMoreInfo">Entity Information</paper-button>
           </div>
           <div class="form-group">
             <paper-checkbox checked="{{entityIgnored}}" class="form-control">
             Exclude this entity from Home Assistant
             </paper-checkbox>
             <paper-input
               disabled="{{entityIgnored}}"
               label="Polling intensity"
               type="number"
               min="0"
               value="{{entityPollingIntensity}}">
             </paper-input>
           </div>
           <div class="card-actions">
             <ha-call-service-button
               hass="[[hass]]"
               domain="zwave"
               service="set_poll_intensity"
               service-data="[[computePollIntensityServiceData(entityPollingIntensity)]]">
               Save
             </ha-call-service-button>
           </div>

           </template>
          </template>
        </paper-card>

        <template is="dom-if" if="[[computeIsNodeSelected(selectedNode)]]">

          <!--Value card-->
          <zwave-values
            hass="[[hass]]"
            nodes="[[nodes]]"
            selected-node="[[selectedNode]]"
            values="[[values]]"
          ></zwave-values>

          <!--Group card-->
          <zwave-groups
            hass="[[hass]]"
            nodes="[[nodes]]"
            selected-node="[[selectedNode]]"
            groups="[[groups]]"
          ></zwave-groups>

          <!--Config card-->
          <zwave-node-config
            hass="[[hass]]"
            nodes="[[nodes]]"
            selected-node="[[selectedNode]]"
            config="[[config]]"
          ></zwave-node-config>

        </template>

        <!--Protection card-->
        <template is="dom-if" if="{{_protectionNode}}">
          <zwave-node-protection
            hass="[[hass]]"
            nodes="[[nodes]]"
            selected-node="[[selectedNode]]"
            protection="[[_protection]]"
          ></zwave-node-protection>
        </template> 

        <!--User Codes-->
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



      <!--Ozw log-->
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
      .sort(sortByName);
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
          !ent.attributes.hidden &&
          "node_id" in ent.attributes &&
          ent.attributes.node_id === nodeid &&
          !ent.entity_id.match("zwave[.]")
        );
      })
      .sort(sortByName);
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
