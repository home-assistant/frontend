import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-call-service-button.js';
import '../../../components/ha-menu-button.js';
import '../../../components/ha-service-description.js';
import '../../../layouts/ha-app-layout.js';
import '../../../resources/ha-style.js';

import '../ha-config-section.js';
import '../ha-form-style.js';
import './zwave-groups.js';
import './zwave-log.js';
import './zwave-network.js';
import './zwave-node-config.js';
import './zwave-node-information.js';
import './zwave-usercodes.js';
import './zwave-values.js';
import './zwave-node-protection.js';

import sortByName from '../../../common/entity/states_sort_by_name.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import computeStateDomain from '../../../common/entity/compute_state_domain.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigZwave extends LocalizeMixin(PolymerElement) {
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
            <ha-call-service-button hass="[[hass]]" domain="zwave" service="refresh_node" service-data="[[computeNodeServiceData(selectedNode)]]">Refresh Node</ha-call-service-button>
            <ha-service-description hass="[[hass]]" domain="zwave" service="refresh_node" hidden$="[[!showHelp]]"></ha-service-description>

            <ha-call-service-button hass="[[hass]]" domain="zwave" service="remove_failed_node" service-data="[[computeNodeServiceData(selectedNode)]]">Remove Failed Node</ha-call-service-button>
            <ha-service-description hass="[[hass]]" domain="zwave" service="remove_failed_node" hidden$="[[!showHelp]]"></ha-service-description>

            <ha-call-service-button hass="[[hass]]" domain="zwave" service="replace_failed_node" service-data="[[computeNodeServiceData(selectedNode)]]">Replace Failed Node</ha-call-service-button>
            <ha-service-description hass="[[hass]]" domain="zwave" service="replace_failed_node" hidden$="[[!showHelp]]"></ha-service-description>

            <ha-call-service-button hass="[[hass]]" domain="zwave" service="print_node" service-data="[[computeNodeServiceData(selectedNode)]]">Print Node</ha-call-service-button>
            <ha-service-description hass="[[hass]]" domain="zwave" service="print_node" hidden$="[[!showHelp]]"></ha-service-description>

            <ha-call-service-button hass="[[hass]]" domain="zwave" service="heal_node" service-data="[[computeHealNodeServiceData(selectedNode)]]">Heal Node</ha-call-service-button>
            <ha-service-description hass="[[hass]]" domain="zwave" service="heal_node" hidden$="[[!showHelp]]"></ha-service-description>

            <ha-call-service-button hass="[[hass]]" domain="zwave" service="test_node" service-data="[[computeNodeServiceData(selectedNode)]]">Test Node</ha-call-service-button>
            <ha-service-description hass="[[hass]]" domain="zwave" service="test_node" hidden$="[[!showHelp]]"></ha-service-description>
          </div>
          <div class="card-actions">
            <paper-input float-label="New node name" type="text" value="{{newNodeNameInput}}" placeholder="[[computeGetNodeName(selectedNode)]]">
            </paper-input>
            <ha-call-service-button hass="[[hass]]" domain="zwave" service="rename_node" service-data="[[computeNodeNameServiceData(newNodeNameInput)]]">Rename Node</ha-call-service-button>
            <ha-service-description hass="[[hass]]" domain="zwave" service="rename_node" hidden$="[[!showHelp]]"></ha-service-description>
           </div>

           <div class="device-picker">
            <paper-dropdown-menu label="Entities of this node" dynamic-align="" class="flex">
              <paper-listbox slot="dropdown-content" selected="{{selectedEntity}}">
                <template is="dom-repeat" items="[[entities]]" as="state">
                  <paper-item>[[computeSelectCaptionEnt(state)]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
           </div>
           <template is="dom-if" if="[[!computeIsEntitySelected(selectedEntity)]]">
           <div class="card-actions">
             <ha-call-service-button hass="[[hass]]" domain="zwave" service="refresh_entity" service-data="[[computeRefreshEntityServiceData(selectedEntity)]]">Refresh Entity</ha-call-service-button>
             <ha-service-description hass="[[hass]]" domain="zwave" service="refresh_entity" hidden$="[[!showHelp]]"></ha-service-description>
           </div>
           <div class="form-group">
             <paper-checkbox checked="{{entityIgnored}}" class="form-control">
             Exclude this entity from Home Assistant
             </paper-checkbox>
             <paper-input disabled="{{entityIgnored}}" label="Polling intensity" type="number" min="0" value="{{entityPollingIntensity}}">
             </paper-input>
           </div>
           <div class="card-actions">
             <ha-call-service-button hass="[[hass]]" domain="zwave" service="set_poll_intensity" service-data="[[computePollIntensityServiceData(entityPollingIntensity)]]">Save</ha-call-service-button>
           </div>
           <div class="content">
             <div class="card-actions">
               <paper-button toggles="" raised="" noink="" active="{{entityInfoActive}}">Entity Attributes</paper-button>
             </div>
             <template is="dom-if" if="{{entityInfoActive}}">
               <template is="dom-repeat" items="[[selectedEntityAttrs]]" as="state">
                 <div class="node-info">
                   <span>[[state]]</span>
                 </div>
               </template>
             </template>
           </div>

           </template>
          </template>
        </paper-card>

        <template is="dom-if" if="[[computeIsNodeSelected(selectedNode)]]">
          <!--Node info card-->
          <zwave-node-information
            id="zwave-node-information"
            nodes="[[nodes]]"
            selected-node="[[selectedNode]]"
          ></zwave-node-information>

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
            _protection="[[_protection]]"
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
        computed: 'computeNodes(hass)'
      },

      selectedNode: {
        type: Number,
        value: -1,
        observer: 'selectedNodeChanged'
      },

      config: {
        type: Array,
        value: function () {
          return [];
        }
      },

      entities: {
        type: Array,
        computed: 'computeEntities(selectedNode)',
      },

      entityInfoActive: {
        type: Boolean,
      },

      selectedEntity: {
        type: Number,
        value: -1,
        observer: 'selectedEntityChanged',
      },

      selectedEntityAttrs: {
        type: Array,
        computed: 'computeSelectedEntityAttrs(selectedEntity)'
      },

      values: {
        type: Array,
      },

      groups: {
        type: Array,
      },

      newNodeNameInput: {
        type: String,
      },

      userCodes: {
        type: Array,
        value: function () {
          return [];
        },
      },

      hasNodeUserCodes: {
        type: Boolean,
        value: false,
      },

      showHelp: {
        type: Boolean,
        value: false,
      },

      entityIgnored: {
        type: Boolean,
      },

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
    this.addEventListener('hass-service-called', ev => this.serviceCalled(ev));
  }

  serviceCalled(ev) {
    var el = this;
    if ((ev.detail.success) && (ev.detail.service === 'set_poll_intensity')) {
      el.saveEntity();
    }
  }

  computeNodes(hass) {
    return Object.keys(hass.states)
      .map(function (key) { return hass.states[key]; })
      .filter(function (ent) {
        return ((ent.entity_id).match('zwave[.]'));
      })
      .sort(sortByName);
  }

  computeEntities(selectedNode) {
    if (!this.nodes || selectedNode === -1) return -1;
    var hass = this.hass;
    var nodeid = this.nodes[this.selectedNode].attributes.node_id;
    return Object.keys(hass.states)
      .map(function (key) { return hass.states[key]; })
      .filter(function (ent) {
        if (ent.attributes.node_id === undefined) {
          return false;
        }
        return (!ent.attributes.hidden &&
                'node_id' in ent.attributes &&
                ent.attributes.node_id === nodeid &&
                (!(ent.entity_id).match('zwave[.]')));
      })
      .sort(sortByName);
  }

  selectedNodeChanged(selectedNode) {
    this.newNodeNameInput = '';

    if (selectedNode === -1) return;
    this.selectedConfigParameter = -1;
    this.selectedConfigParameterValue = -1;
    this.selectedGroup = -1;

    this.hass.callApi('GET', 'zwave/config/' + this.nodes[selectedNode].attributes.node_id).then((configs) => {
      this.config = this._objToArray(configs);
    });

    this.hass.callApi('GET', 'zwave/values/' + this.nodes[selectedNode].attributes.node_id).then((values) => {
      this.values = this._objToArray(values);
    });

    this.hass.callApi('GET', 'zwave/groups/' + this.nodes[selectedNode].attributes.node_id).then((groups) => {
      this.groups = this._objToArray(groups);
    });

    this.hasNodeUserCodes = false;
    this.notifyPath('hasNodeUserCodes');
    this.hass.callApi('GET', 'zwave/usercodes/' + this.nodes[selectedNode].attributes.node_id).then((usercodes) => {
      this.userCodes = this._objToArray(usercodes);
      this.hasNodeUserCodes = this.userCodes.length > 0;
      this.notifyPath('hasNodeUserCodes');
    });
    this.hass.callApi('GET', `zwave/protection/${this.nodes[selectedNode].attributes.node_id}`).then((protections) => {
      this._protection = this._objToArray(protections);
      if (this._protection) {
        if (this._protection.length === 0) {
          return;
        }
        this._protectionNode = true;
      }
    });
  }

  selectedEntityChanged(selectedEntity) {
    if (selectedEntity === -1) return;
    var el = this;
    el.hass.callApi('GET', 'zwave/values/' + el.nodes[el.selectedNode].attributes.node_id).then((values) => {
      el.values = el._objToArray(values);
    });

    var valueId = el.entities[selectedEntity].attributes.value_id;
    var valueData = el.values.find(function (obj) { return obj.key === valueId; });
    var valueIndex = el.values.indexOf(valueData);
    el.hass.callApi('GET', 'config/zwave/device_config/' + valueId)
      .then(function (data) {
        el.entityIgnored = data.ignored || false;
        el.entityPollingIntensity = el.values[valueIndex].value.poll_intensity;
      });
  }

  computeSelectedEntityAttrs(selectedEntity) {
    if (selectedEntity === -1) return 'No entity selected';
    var entityAttrs = this.entities[selectedEntity].attributes;
    var att = [];
    Object.keys(entityAttrs).forEach(function (key) {
      att.push(key + ': ' + entityAttrs[key]);
    });
    return att.sort();
  }

  computeSelectCaption(stateObj) {
    return computeStateName(stateObj) + ' (Node:' +
      stateObj.attributes.node_id + ' ' +
      stateObj.attributes.query_stage + ')';
  }

  computeSelectCaptionEnt(stateObj) {
    return (computeStateDomain(stateObj) + '.'
            + computeStateName(stateObj));
  }

  computeIsNodeSelected() {
    return (this.nodes && this.selectedNode !== -1);
  }

  computeIsEntitySelected(selectedEntity) {
    return (selectedEntity === -1);
  }

  computeNodeServiceData(selectedNode) {
    return { node_id: this.nodes[selectedNode].attributes.node_id };
  }

  computeHealNodeServiceData(selectedNode) {
    return {
      node_id: this.nodes[selectedNode].attributes.node_id,
      return_routes: true
    };
  }

  computeGetNodeName(selectedNode) {
    if (this.selectedNode === -1 ||
      !this.nodes[selectedNode].entity_id) return -1;
    return this.nodes[selectedNode].attributes.node_name;
  }

  computeNodeNameServiceData(newNodeNameInput) {
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      name: newNodeNameInput
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

  saveEntity() {
    var data = {
      ignored: this.entityIgnored,
      polling_intensity: parseInt(this.entityPollingIntensity),
    };
    return this.hass.callApi('POST', 'config/zwave/device_config/' + this.entities[this.selectedEntity].entity_id, data);
  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  _objToArray(obj) {
    var array = [];
    Object.keys(obj).forEach(function (key) {
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

customElements.define('ha-config-zwave', HaConfigZwave);
