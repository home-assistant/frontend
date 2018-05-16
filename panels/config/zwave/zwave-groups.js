import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../src/components/buttons/ha-call-service-button.js';

import computeStateName from '../../../js/common/entity/compute_state_name.js';

class ZwaveGroups extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        margin-top: 24px;
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

      .help-text {
        padding-left: 24px;
        padding-right: 24px;
        padding-bottom: 12px;
      }
    </style>
    <paper-card class="content" heading="Node group associations">
      <!--TODO make api for getting groups and members-->
      <div class="device-picker">
        <paper-dropdown-menu label="Group" dynamic-align="" class="flex">
          <paper-listbox slot="dropdown-content" selected="{{selectedGroup}}">
            <template is="dom-repeat" items="[[groups]]" as="state">
              <paper-item>[[computeSelectCaptionGroup(state)]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      <template is="dom-if" if="[[computeIsGroupSelected(selectedGroup)]]">
        <div class="device-picker">
          <paper-dropdown-menu label="Node to control" dynamic-align="" class="flex">
            <paper-listbox slot="dropdown-content" selected="{{selectedTargetNode}}">
              <template is="dom-repeat" items="[[nodes]]" as="state">
                <paper-item>[[computeSelectCaption(state)]]</paper-item>
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>

        <div class="help-text">
          <span>Other Nodes in this group:</span>
          <template is="dom-repeat" items="[[otherGroupNodes]]" as="state">
            <div>[[state]]</div>
          </template>
        </div>
        <div class="help-text">
          <span>Max Associations:</span>
          <span>[[maxAssociations]]</span>
        </div>
      </template>

      <template is="dom-if" if="[[computeIsTargetNodeSelected(selectedTargetNode)]]">
        <div class="card-actions">
          <template is="dom-if" if="[[!noAssociationsLeft]]">
            <ha-call-service-button hass="[[hass]]" domain="zwave" service="change_association" service-data="[[computeAssocServiceData(selectedGroup, &quot;add&quot;)]]">Add To Group</ha-call-service-button>
          </template>
          <template is="dom-if" if="[[computeTargetInGroup(selectedGroup, selectedTargetNode)]]">
            <ha-call-service-button hass="[[hass]]" domain="zwave" service="change_association" service-data="[[computeAssocServiceData(selectedGroup, &quot;remove&quot;)]]">Remove From Group</ha-call-service-button>
          </template>
        </div>
      </template>
    </paper-card>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      nodes: {
        type: Array,
      },

      groups: {
        type: Array,
      },

      selectedNode: {
        type: Number,
      },

      selectedTargetNode: {
        type: Number,
        value: -1
      },

      selectedGroup: {
        type: Number,
        value: -1,
        observer: 'selectedGroupChanged'
      },

      otherGroupNodes: {
        type: Array,
        value: -1,
        computed: 'computeOtherGroupNodes(selectedGroup)'
      },

      maxAssociations: {
        type: String,
        value: '',
        computed: 'computeMaxAssociations(selectedGroup)'
      },

      noAssociationsLeft: {
        type: Boolean,
        value: true,
        computed: 'computeAssociationsLeft(selectedGroup)'
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener('hass-service-called', ev => this.serviceCalled(ev));
  }

  serviceCalled(ev) {
    if (ev.detail.success) {
      var foo = this;
      setTimeout(function () {
        foo.refreshGroups(foo.selectedNode);
      }, 5000);
    }
  }

  computeAssociationsLeft(selectedGroup) {
    if (selectedGroup === -1) return true;
    return (this.maxAssociations === this.otherGroupNodes.length);
  }

  computeMaxAssociations(selectedGroup) {
    if (selectedGroup === -1) return -1;
    var maxAssociations = this.groups[selectedGroup].value.max_associations;
    if (!maxAssociations) return 'None';
    return maxAssociations;
  }

  computeOtherGroupNodes(selectedGroup) {
    if (selectedGroup === -1) return -1;
    var associations = Object.values(this.groups[selectedGroup].value.association_instances);
    if (!associations.length) return ['None'];
    return associations.map((assoc) => {
      if (!assoc.length || assoc.length !== 2) {
        return 'Unknown Node: ' + assoc;
      }
      const id = assoc[0];
      const instance = assoc[1];
      const node = this.nodes.find(n => n.attributes.node_id === id);
      if (!node) {
        return 'Unknown Node (id: ' + (instance ? id + '.' + instance : id) + ')';
      }
      let caption = this.computeSelectCaption(node);
      if (instance) {
        caption += '/ Instance: ' + instance;
      }
      return caption;
    });
  }

  computeTargetInGroup(selectedGroup, selectedTargetNode) {
    if (selectedGroup === -1 || selectedTargetNode === -1) return false;
    const associations = Object.values(this.groups[selectedGroup].value.associations);
    if (!associations.length) return false;
    return associations.indexOf(this.nodes[selectedTargetNode].attributes.node_id) !== -1;
  }

  computeSelectCaption(stateObj) {
    return computeStateName(stateObj) + ' (Node:' +
      stateObj.attributes.node_id + ' ' +
      stateObj.attributes.query_stage + ')';
  }

  computeSelectCaptionGroup(stateObj) {
    return (stateObj.key + ': ' + stateObj.value.label);
  }

  computeIsTargetNodeSelected(selectedTargetNode) {
    return this.nodes && selectedTargetNode !== -1;
  }

  computeIsGroupSelected(selectedGroup) {
    return this.nodes && this.selectedNode !== -1 && selectedGroup !== -1;
  }

  computeAssocServiceData(selectedGroup, type) {
    if (!this.groups === -1 || selectedGroup === -1 || this.selectedNode === -1) return -1;
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      association: type,
      target_node_id: this.nodes[this.selectedTargetNode].attributes.node_id,
      group: this.groups[selectedGroup].key
    };
  }

  refreshGroups(selectedNode) {
    var groupData = [];
    this.hass.callApi('GET', 'zwave/groups/' + this.nodes[selectedNode].attributes.node_id).then(function (groups) {
      Object.keys(groups).forEach(function (key) {
        groupData.push({
          key: key,
          value: groups[key],
        });
      });
      this.groups = groupData;
      this.selectedGroupChanged(this.selectedGroup);
    }.bind(this));
  }

  selectedGroupChanged(selectedGroup) {
    if (this.selectedGroup === -1 || selectedGroup === -1) return;
    this.maxAssociations = this.groups[selectedGroup].value.max_associations;
    this.otherGroupNodes = Object.values(this.groups[selectedGroup].value.associations);
  }
}

customElements.define('zwave-groups', ZwaveGroups);
