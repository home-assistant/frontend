import "@polymer/paper-card/paper-card";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-menu-button";
import "../../../components/ha-service-description";
import "../../../layouts/ha-app-layout";
import "../../../resources/ha-style";

import "../ha-config-section";
import "./zha-node-information";

import sortByName from "../../../common/entity/states_sort_by_name";
import computeStateName from "../../../common/entity/compute_state_name";
import computeStateDomain from "../../../common/entity/compute_state_domain";
import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class ZhaNode extends LocalizeMixin(PolymerElement) {
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
        .input-text {
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
      <!-- Node card -->
      <ha-config-section is-wide="[[isWide]]">
        <div style="position: relative" slot="header">
          <span>ZHA Node Management</span>
          <paper-icon-button
            class="toggle-help-icon"
            on-click="toggleHelp"
            icon="hass:help-circle"
          ></paper-icon-button>
        </div>
        <span slot="introduction">
          Run ZHA commands that affect a single node. Pick a node to see a list
          of available commands. <br /><br />Note: Sleepy (battery powered)
          devices need to be awake when executing commands against them. You can
          generally wake a sleepy device by triggering it. <br /><br />Some
          devices such as Xiaomi sensors have a wake up button that you can
          press at ~5 second intervals that keep devices awake while you
          interact with them.
        </span>
        <paper-card class="content">
          <div class="device-picker">
            <paper-dropdown-menu dynamic-align="" label="Nodes" class="flex">
              <paper-listbox
                slot="dropdown-content"
                selected="{{ selectedNode }}"
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
                Select node to view per-node options
              </div>
            </template>
          </template>
          <template is="dom-if" if="[[computeIsNodeSelected(selectedNode)]]">
            <!-- Node info card -->
            <zha-node-information
              id="zha-node-information"
              nodes="[[nodes]]"
              selected-node="[[selectedNode]]"
            ></zha-node-information>
            <div class="card-actions">
              <ha-call-service-button
                hass="[[hass]]"
                domain="zha"
                service="reconfigure_device"
                service-data="[[computeNodeServiceData(selectedNode)]]"
                >Reconfigure Node</ha-call-service-button
              >
              <ha-service-description
                hass="[[hass]]"
                domain="zha"
                service="reconfigure_device"
                hidden$="[[!showHelp]]"
              ></ha-service-description>
              <ha-call-service-button
                hass="[[hass]]"
                domain="zha"
                service="remove"
                service-data="[[computeNodeServiceData(selectedNode)]]"
                >Remove Node</ha-call-service-button
              >
              <ha-service-description
                hass="[[hass]]"
                domain="zha"
                service="remove"
                hidden$="[[!showHelp]]"
              ></ha-service-description>
            </div>
            <div class="device-picker">
              <paper-dropdown-menu
                label="Entities of this node"
                dynamic-align=""
                class="flex"
              >
                <paper-listbox
                  slot="dropdown-content"
                  selected="{{ selectedEntity }}"
                >
                  <template is="dom-repeat" items="[[entities]]" as="state">
                    <paper-item>[[state.entity_id]]</paper-item>
                  </template>
                </paper-listbox>
              </paper-dropdown-menu>
            </div>
            <template
              is="dom-if"
              if="[[computeIsEntitySelected(selectedEntity)]]"
            >
              <div class="device-picker">
                <paper-dropdown-menu
                  label="Clusters of this entity"
                  dynamic-align=""
                  class="flex"
                >
                  <paper-listbox
                    slot="dropdown-content"
                    selected="{{ selectedCluster }}"
                  >
                    <template is="dom-repeat" items="[[clusters]]" as="cluster">
                      <paper-item>[[computeClusterKey(cluster)]]</paper-item>
                    </template>
                  </paper-listbox>
                </paper-dropdown-menu>
              </div>
            </template>
            <template
              is="dom-if"
              if="[[computeIsClusterSelected(selectedCluster)]]"
            >
              <template is="dom-if" if="[[computeNotClusterCommandSelected()]]">
                <div class="device-picker">
                  <paper-dropdown-menu
                    label="Attributes of this cluster"
                    dynamic-align=""
                    class="flex"
                  >
                    <paper-listbox
                      slot="dropdown-content"
                      selected="{{ selectedClusterAttribute }}"
                    >
                      <template
                        is="dom-repeat"
                        items="[[clusterAttributes]]"
                        as="clusterAttribute"
                      >
                        <paper-item
                          >[[computeClusterAttributeKey(clusterAttribute)]]</paper-item
                        >
                      </template>
                    </paper-listbox>
                  </paper-dropdown-menu>
                </div>
              </template>

              <template
                is="dom-if"
                if="[[computeIsClusterAttributeSelected(selectedClusterAttribute)]]"
              >
                <div class="input-text">
                  <paper-input
                    label="Value"
                    type="string"
                    value="{{ attributeValue }}"
                    placeholder="Value"
                  ></paper-input>
                </div>
                <div class="input-text">
                  <paper-input
                    label="Manufacturer code override"
                    type="number"
                    value="{{ manufacturerCodeOverride }}"
                    placeholder="Value"
                  ></paper-input>
                </div>
                <template
                  is="dom-if"
                  if="[[computeIsClusterAttributeSelected(selectedClusterAttribute)]]"
                >
                  <div class="card-actions">
                    <ha-progress-button on-click="readZigbeeClusterAttribute"
                      ><slot></slot>Get Zigbee Attribute</ha-progress-button
                    >
                    <ha-call-service-button
                      hass="[[hass]]"
                      domain="zha"
                      service="set_zigbee_cluster_attribute"
                      service-data="[[computeSetAttributeServiceData(attributeValue)]]"
                      >Set Zigbee Attribute</ha-call-service-button
                    >
                    <ha-service-description
                      hass="[[hass]]"
                      domain="zha"
                      service="set_zigbee_cluster_attribute"
                      hidden$="[[!showHelp]]"
                    ></ha-service-description>
                  </div>
                </template>
              </template>

              <template
                is="dom-if"
                if="[[computeNotClusterAttributeSelected()]]"
              >
                <div class="device-picker">
                  <paper-dropdown-menu
                    label="Commands of this cluster"
                    dynamic-align=""
                    class="flex"
                  >
                    <paper-listbox
                      slot="dropdown-content"
                      selected="{{ selectedClusterCommand }}"
                    >
                      <template
                        is="dom-repeat"
                        items="[[clusterCommands]]"
                        as="clusterCommand"
                      >
                        <paper-item
                          >[[computeClusterCommandKey(clusterCommand)]]</paper-item
                        >
                      </template>
                    </paper-listbox>
                  </paper-dropdown-menu>
                </div>
              </template>
            </template>
            <template
              is="dom-if"
              if="[[computeIsClusterCommandSelected(selectedClusterCommand)]]"
            >
              <div class="card-actions">
                <ha-call-service-button
                  hass="[[hass]]"
                  domain="zha"
                  service="issue_zigbee_cluster_command"
                  service-data="[[computeClusterCommandServiceData(selectedClusterCommand)]]"
                  >Issue Zigbee Command</ha-call-service-button
                >
                <ha-service-description
                  hass="[[hass]]"
                  domain="zha"
                  service="issue_zigbee_cluster_command"
                  hidden$="[[!showHelp]]"
                ></ha-service-description>
              </div>
            </template>
          </template>
        </paper-card>
      </ha-config-section>
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

      config: {
        type: Array,
        value: function() {
          return [];
        },
      },

      entities: {
        type: Array,
      },

      selectedEntity: {
        type: Number,
        value: -1,
        observer: "selectedEntityChanged",
      },

      clusters: {
        type: Array,
      },

      selectedCluster: {
        type: Number,
        value: -1,
        observer: "selectedClusterChanged",
      },

      clusterAttributes: {
        type: Array,
      },

      selectedClusterAttribute: {
        type: Number,
        value: -1,
        observer: "selectedClusterAttributeChanged",
      },

      clusterCommands: {
        type: Array,
      },

      selectedClusterCommand: {
        type: Number,
        value: -1,
        observer: "selectedClusterCommandChanged",
      },

      entityInfoActive: {
        type: Boolean,
      },

      values: {
        type: Array,
      },

      attributeValue: String,

      manufacturerCodeOverride: Number,

      showHelp: {
        type: Boolean,
        value: false,
      },

      entityIgnored: {
        type: Boolean,
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

  serviceCalled(ev) {}

  computeNodes(hass) {
    return Object.keys(hass.states)
      .map(function(key) {
        return hass.states[key];
      })
      .filter(function(ent) {
        return ent.entity_id.match("zha[.]");
      })
      .sort(sortByName);
  }

  computeSelectCaption(stateObj) {
    return (
      computeStateName(stateObj) + " (Node:" + stateObj.attributes.ieee + ")"
    );
  }

  computeClusterKey(cluster) {
    return (
      cluster.name + " (id: " + cluster.id + ", type: " + cluster.type + ")"
    );
  }

  computeClusterCommandKey(clusterCommand) {
    return (
      clusterCommand.name +
      " (id: " +
      clusterCommand.id +
      ", type: " +
      clusterCommand.type +
      ")"
    );
  }

  computeClusterAttributeKey(clusterAttribute) {
    return clusterAttribute.name + " (id: " + clusterAttribute.id + ")";
  }

  computeSelectCaptionEnt(stateObj) {
    return computeStateDomain(stateObj) + "." + computeStateName(stateObj);
  }

  computeIsNodeSelected() {
    return this.nodes && this.selectedNode !== -1;
  }

  computeNotClusterAttributeSelected() {
    return this.selectedClusterAttribute === -1;
  }

  computeNotClusterCommandSelected() {
    return this.selectedClusterCommand === -1;
  }

  computeIsEntitySelected(selectedEntity) {
    return this.entities && selectedEntity !== -1;
  }

  computeIsClusterSelected(selectedCluster) {
    return this.clusters && selectedCluster !== -1;
  }

  computeIsClusterAttributeSelected(selectedClusterAttribute) {
    return this.clusters && selectedClusterAttribute !== -1;
  }

  computeIsClusterCommandSelected(selectedClusterCommand) {
    return this.clusters && selectedClusterCommand !== -1;
  }

  computeNodeServiceData(selectedNode) {
    return { ieee_address: this.nodes[selectedNode].attributes.ieee };
  }

  computeClusterServiceData(selectedNode, selectedEntity, selectedCluster) {
    return {
      ieee_address: this.nodes[selectedNode].attributes.ieee,
      entity_id: this.entities[selectedEntity].entity_id,
      cluster_id: this.clusters[selectedCluster].id,
      cluster_type: this.clusters[selectedCluster].type,
    };
  }

  computeClusterCommandServiceData(selectedClusterCommand) {
    return {
      entity_id: this.entities[this.selectedEntity].entity_id,
      cluster_id: this.clusters[this.selectedCluster].id,
      cluster_type: this.clusters[this.selectedCluster].type,
      command: this.clusterCommands[selectedClusterCommand].id,
      command_type: this.clusterCommands[selectedClusterCommand].type,
    };
  }

  computeReadAttributeServiceData() {
    return {
      entity_id: this.entities[this.selectedEntity].entity_id,
      cluster_id: this.clusters[this.selectedCluster].id,
      cluster_type: this.clusters[this.selectedCluster].type,
      attribute: this.clusterAttributes[this.selectedClusterAttribute].id,
      manufacturer:
        this.manufacturerCodeOverride != null
          ? parseInt(this.manufacturerCodeOverride)
          : this.nodes[this.selectedNode].attributes.manufacturer_code,
      type: "zha/entities/clusters/attributes/value",
    };
  }

  computeSetAttributeServiceData(attributeValue) {
    return {
      entity_id: this.entities[this.selectedEntity].entity_id,
      cluster_id: this.clusters[this.selectedCluster].id,
      cluster_type: this.clusters[this.selectedCluster].type,
      attribute: this.clusterAttributes[this.selectedClusterAttribute].id,
      value: attributeValue,
      manufacturer:
        this.manufacturerCodeOverride != null
          ? parseInt(this.manufacturerCodeOverride)
          : this.nodes[this.selectedNode].attributes.manufacturer_code,
    };
  }

  readZigbeeClusterAttribute() {
    this.hass.callWS(this.computeReadAttributeServiceData()).then((value) => {
      this.setProperties({ attributeValue: value });
    });
  }

  selectedEntityChanged(selectedEntity) {
    if (selectedEntity === -1) return;
    this.selectedCluster = -1;
    this.selectedClusterAttribute = -1;
    this.selectedClusterCommand = -1;
    this.hass
      .callWS({
        type: "zha/entities/clusters",
        entity_id: this.entities[selectedEntity].entity_id,
        ieee: this.entities[selectedEntity].device_info.identifiers[0][1],
      })
      .then((clusters) => {
        this.setProperties({ clusters: clusters });
      });
  }

  selectedClusterChanged(selectedCluster) {
    if (selectedCluster === -1) return;
    this.selectedClusterAttribute = -1;
    this.selectedClusterCommand = -1;
    this.hass
      .callWS({
        type: "zha/entities/clusters/attributes",
        entity_id: this.entities[this.selectedEntity].entity_id,
        ieee: this.entities[this.selectedEntity].device_info.identifiers[0][1],
        cluster_id: this.clusters[selectedCluster].id,
        cluster_type: this.clusters[selectedCluster].type,
      })
      .then((clusterAttributes) => {
        this.setProperties({ clusterAttributes: clusterAttributes });
      });
    this.hass
      .callWS({
        type: "zha/entities/clusters/commands",
        entity_id: this.entities[this.selectedEntity].entity_id,
        ieee: this.entities[this.selectedEntity].device_info.identifiers[0][1],
        cluster_id: this.clusters[selectedCluster].id,
        cluster_type: this.clusters[selectedCluster].type,
      })
      .then((clusterCommands) => {
        this.setProperties({ clusterCommands: clusterCommands });
      });
  }

  selectedClusterAttributeChanged(selectedClusterAttribute) {
    if (selectedClusterAttribute === -1) return;
    this.selectedClusterCommand = -1;
    this.attributeValue = "";
    this.manufacturerCodeOverride = null;
  }

  selectedClusterCommandChanged(selectedClusterCommand) {
    if (selectedClusterCommand === -1) return;
    this.selectedClusterAttribute = -1;
    this.attributeValue = "";
    this.manufacturerCodeOverride = null;
  }

  selectedNodeChanged(selectedNode) {
    if (!this.nodes || selectedNode === -1) return;
    this.selectedEntity = -1;
    this.selectedCluster = -1;
    this.selectedClusterAttribute = -1;
    this.selectedClusterCommand = -1;
    const ieee = this.nodes[this.selectedNode].attributes.ieee;
    this.hass.callWS({ type: "zha/entities" }).then((entities) => {
      this.setProperties({ entities: entities[ieee] });
    });
  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  _objToArray(obj) {
    var array = [];
    Object.keys(obj).forEach(function(key) {
      array.push({
        key: key,
        value: obj[key],
      });
    });
    return array;
  }

  _backTapped() {
    history.back();
  }
}

customElements.define("zha-node", ZhaNode);
