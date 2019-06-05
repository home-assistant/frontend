import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-card";

import computeStateName from "../../../common/entity/compute_state_name";

class ZwaveGroups extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          margin-top: 24px;
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

        .help-text {
          padding-left: 24px;
          padding-right: 24px;
          padding-bottom: 12px;
        }
      </style>
      <ha-card class="content" header="Node group associations">
        <!-- TODO make api for getting groups and members -->
        <div class="device-picker">
          <paper-dropdown-menu label="Group" dynamic-align="" class="flex">
            <paper-listbox
              slot="dropdown-content"
              selected="{{_selectedGroup}}"
            >
              <template is="dom-repeat" items="[[groups]]" as="state">
                <paper-item>[[_computeSelectCaptionGroup(state)]]</paper-item>
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        <template is="dom-if" if="[[_computeIsGroupSelected(_selectedGroup)]]">
          <div class="device-picker">
            <paper-dropdown-menu
              label="Node to control"
              dynamic-align=""
              class="flex"
            >
              <paper-listbox
                slot="dropdown-content"
                selected="{{_selectedTargetNode}}"
              >
                <template is="dom-repeat" items="[[nodes]]" as="state">
                  <paper-item>[[_computeSelectCaption(state)]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>

          <div class="help-text">
            <span>Other Nodes in this group:</span>
            <template is="dom-repeat" items="[[_otherGroupNodes]]" as="state">
              <div>[[state]]</div>
            </template>
          </div>
          <div class="help-text">
            <span>Max Associations:</span> <span>[[_maxAssociations]]</span>
          </div>
        </template>

        <template
          is="dom-if"
          if="[[_computeIsTargetNodeSelected(_selectedTargetNode)]]"
        >
          <div class="card-actions">
            <template is="dom-if" if="[[!_noAssociationsLeft]]">
              <ha-call-service-button
                hass="[[hass]]"
                domain="zwave"
                service="change_association"
                service-data="[[_addAssocServiceData]]"
              >
                Add To Group
              </ha-call-service-button>
            </template>
            <template
              is="dom-if"
              if="[[_computeTargetInGroup(_selectedGroup, _selectedTargetNode)]]"
            >
              <ha-call-service-button
                hass="[[hass]]"
                domain="zwave"
                service="change_association"
                service-data="[[_removeAssocServiceData]]"
              >
                Remove From Group
              </ha-call-service-button>
            </template>
            <template is="dom-if" if="[[_isBroadcastNodeInGroup]]">
              <ha-call-service-button
                hass="[[hass]]"
                domain="zwave"
                service="change_association"
                service-data="[[_removeBroadcastNodeServiceData]]"
              >
                Remove Broadcast
              </ha-call-service-button>
            </template>
          </div>
        </template>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      nodes: Array,

      groups: Array,

      selectedNode: {
        type: Number,
        observer: "_selectedNodeChanged",
      },

      _selectedTargetNode: {
        type: Number,
        value: -1,
        observer: "_selectedTargetNodeChanged",
      },

      _selectedGroup: {
        type: Number,
        value: -1,
      },

      _otherGroupNodes: {
        type: Array,
        value: -1,
        computed: "_computeOtherGroupNodes(_selectedGroup)",
      },

      _maxAssociations: {
        type: String,
        value: "",
        computed: "_computeMaxAssociations(_selectedGroup)",
      },

      _noAssociationsLeft: {
        type: Boolean,
        value: true,
        computed: "_computeAssociationsLeft(_selectedGroup)",
      },

      _addAssocServiceData: {
        type: String,
        value: "",
      },

      _removeAssocServiceData: {
        type: String,
        value: "",
      },

      _removeBroadcastNodeServiceData: {
        type: String,
        value: "",
      },

      _isBroadcastNodeInGroup: {
        type: Boolean,
        value: false,
      },
    };
  }

  static get observers() {
    return ["_selectedGroupChanged(groups, _selectedGroup)"];
  }

  ready() {
    super.ready();
    this.addEventListener("hass-service-called", (ev) =>
      this.serviceCalled(ev)
    );
  }

  serviceCalled(ev) {
    if (ev.detail.success) {
      setTimeout(() => {
        this._refreshGroups(this.selectedNode);
      }, 5000);
    }
  }

  _computeAssociationsLeft(selectedGroup) {
    if (selectedGroup === -1) return true;
    return this._maxAssociations === this._otherGroupNodes.length;
  }

  _computeMaxAssociations(selectedGroup) {
    if (selectedGroup === -1) return -1;
    const maxAssociations = this.groups[selectedGroup].value.max_associations;
    if (!maxAssociations) return "None";
    return maxAssociations;
  }

  _computeOtherGroupNodes(selectedGroup) {
    if (selectedGroup === -1) return -1;
    this.setProperties({ _isBroadcastNodeInGroup: false });
    const associations = Object.values(
      this.groups[selectedGroup].value.association_instances
    );
    if (!associations.length) return ["None"];
    return associations.map((assoc) => {
      if (!assoc.length || assoc.length !== 2) {
        return `Unknown Node: ${assoc}`;
      }
      const id = assoc[0];
      const instance = assoc[1];
      const node = this.nodes.find((n) => n.attributes.node_id === id);
      if (id === 255) {
        this.setProperties({
          _isBroadcastNodeInGroup: true,
          _removeBroadcastNodeServiceData: {
            node_id: this.nodes[this.selectedNode].attributes.node_id,
            association: "remove",
            target_node_id: 255,
            group: this.groups[selectedGroup].key,
          },
        });
      }
      if (!node) {
        return `Unknown Node (${id}: (${instance} ? ${id}.${instance} : ${id}))`;
      }
      let caption = this._computeSelectCaption(node);
      if (instance) {
        caption += `/ Instance: ${instance}`;
      }
      return caption;
    });
  }

  _computeTargetInGroup(selectedGroup, selectedTargetNode) {
    if (selectedGroup === -1 || selectedTargetNode === -1) return false;
    const associations = Object.values(
      this.groups[selectedGroup].value.associations
    );
    if (!associations.length) return false;
    return (
      associations.indexOf(
        this.nodes[selectedTargetNode].attributes.node_id
      ) !== -1
    );
  }

  _computeSelectCaption(stateObj) {
    return `${computeStateName(stateObj)}
      (Node: ${stateObj.attributes.node_id}
      ${stateObj.attributes.query_stage})`;
  }

  _computeSelectCaptionGroup(stateObj) {
    return `${stateObj.key}: ${stateObj.value.label}`;
  }

  _computeIsTargetNodeSelected(selectedTargetNode) {
    return this.nodes && selectedTargetNode !== -1;
  }

  _computeIsGroupSelected(selectedGroup) {
    return this.nodes && this.selectedNode !== -1 && selectedGroup !== -1;
  }

  _computeAssocServiceData(selectedGroup, type) {
    if (
      !this.groups === -1 ||
      selectedGroup === -1 ||
      this.selectedNode === -1 ||
      this._selectedTargetNode === -1
    )
      return -1;
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      association: type,
      target_node_id: this.nodes[this._selectedTargetNode].attributes.node_id,
      group: this.groups[selectedGroup].key,
    };
  }

  async _refreshGroups(selectedNode) {
    const groupData = [];
    const groups = await this.hass.callApi(
      "GET",
      `zwave/groups/${this.nodes[selectedNode].attributes.node_id}`
    );
    Object.keys(groups).forEach((key) => {
      groupData.push({
        key,
        value: groups[key],
      });
    });
    this.setProperties({
      groups: groupData,
      _maxAssociations: groupData[this._selectedGroup].value.max_associations,
      _otherGroupNodes: Object.values(
        groupData[this._selectedGroup].value.associations
      ),
      _isBroadcastNodeInGroup: false,
    });
    const oldGroup = this._selectedGroup;
    this.setProperties({ _selectedGroup: -1 });
    this.setProperties({ _selectedGroup: oldGroup });
  }

  _selectedGroupChanged() {
    if (this._selectedGroup === -1) return;
    this.setProperties({
      _maxAssociations: this.groups[this._selectedGroup].value.max_associations,
      _otherGroupNodes: Object.values(
        this.groups[this._selectedGroup].value.associations
      ),
    });
  }

  _selectedTargetNodeChanged() {
    if (this._selectedGroup === -1) return;
    if (
      this._computeTargetInGroup(this._selectedGroup, this._selectedTargetNode)
    ) {
      this.setProperties({
        _removeAssocServiceData: this._computeAssocServiceData(
          this._selectedGroup,
          "remove"
        ),
      });
    } else {
      this.setProperties({
        _addAssocServiceData: this._computeAssocServiceData(
          this._selectedGroup,
          "add"
        ),
      });
    }
  }

  _selectedNodeChanged() {
    if (this.selectedNode === -1) return;
    this.setProperties({ _selectedTargetNode: -1, _selectedGroup: -1 });
  }
}

customElements.define("zwave-groups", ZwaveGroups);
