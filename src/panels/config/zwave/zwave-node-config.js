import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-call-service-button.js';

class ZwaveNodeConfig extends PolymerElement {
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
      }
    </style>
    <div class="content">
      <paper-card heading="Node config options">
        <template is="dom-if" if="[[wakeupNode]]">
          <div class="card-actions">
            <paper-input float-label="Wakeup Interval" type="number" value="{{wakeupInput}}" placeholder="[[computeGetWakeupValue(selectedNode)]]">
               <div suffix="">seconds</div>
            </paper-input>
            <ha-call-service-button hass="[[hass]]" domain="zwave" service="set_wakeup" service-data="[[computeWakeupServiceData(wakeupInput)]]">Set Wakeup</ha-call-service-button>
          </div>
        </template>
        <div class="device-picker">
        <paper-dropdown-menu label="Config parameter" dynamic-align="" class="flex">
          <paper-listbox slot="dropdown-content" selected="{{selectedConfigParameter}}">
            <template is="dom-repeat" items="[[config]]" as="state">
              <paper-item>[[computeSelectCaptionConfigParameter(state)]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
        </div>
        <template is="dom-if" if="[[isConfigParameterSelected(selectedConfigParameter, 'List')]]">
          <div class="device-picker">
            <paper-dropdown-menu label="Config value" dynamic-align="" class="flex" placeholder="{{loadedConfigValue}}">
              <paper-listbox slot="dropdown-content" selected="{{selectedConfigValue}}">
                <template is="dom-repeat" items="[[selectedConfigParameterValues]]" as="state">
                  <paper-item>[[state]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
        </template>

        <template is="dom-if" if="[[isConfigParameterSelected(selectedConfigParameter, 'Byte Short Int')]]">
          <div class="card-actions">
            <paper-input label="{{selectedConfigParameterNumValues}}" type="number" value="{{selectedConfigValue}}" max="{{configParameterMax}}" min="{{configParameterMin}}">
            </paper-input>
          </div>
        </template>
        <template is="dom-if" if="[[isConfigParameterSelected(selectedConfigParameter, 'Bool Button')]]">
          <div class="device-picker">
            <paper-dropdown-menu label="Config value" class="flex" dynamic-align="" placeholder="{{loadedConfigValue}}">
              <paper-listbox slot="dropdown-content" selected="{{selectedConfigValue}}">
                <template is="dom-repeat" items="[[selectedConfigParameterValues]]" as="state">
                  <paper-item>[[state]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
        </template>
        <div class="help-text">
          <span>[[configValueHelpText]]</span>
        </div>
        <template is="dom-if" if="[[isConfigParameterSelected(selectedConfigParameter, 'Bool Button Byte Short Int List')]]">
          <div class="card-actions">
            <ha-call-service-button hass="[[hass]]" domain="zwave" service="set_config_parameter" service-data="[[computeSetConfigParameterServiceData(selectedConfigValue)]]">Set Config Parameter</ha-call-service-button>
          </div>
        </template>
      </paper-card>
    </div>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      nodes: {
        type: Array,
        observer: 'nodesChanged'
      },

      selectedNode: {
        type: Number,
        value: -1,
        observer: 'nodesChanged'
      },

      config: {
        type: Array,
        value: function () {
          return [];
        }
      },

      selectedConfigParameter: {
        type: Number,
        value: -1,
        observer: 'selectedConfigParameterChanged'
      },

      configParameterMax: {
        type: Number,
        value: -1
      },

      configParameterMin: {
        type: Number,
        value: -1
      },

      configValueHelpText: {
        type: String,
        value: '',
        computed: 'computeConfigValueHelp(selectedConfigParameter)'
      },

      selectedConfigParameterType: {
        type: String,
        value: ''
      },

      selectedConfigValue: {
        type: Number,
        value: -1,
        observer: 'computeSetConfigParameterServiceData'
      },

      selectedConfigParameterValues: {
        type: Array,
        value: function () {
          return [];
        }
      },

      selectedConfigParameterNumValues: {
        type: String,
        value: ''
      },

      loadedConfigValue: {
        type: Number,
        value: -1
      },

      wakeupInput: {
        type: Number,
      },

      wakeupNode: {
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
    if (ev.detail.success) {
      var foo = this;
      setTimeout(function () {
        foo.refreshConfig(foo.selectedNode);
      }, 5000);
    }
  }

  nodesChanged() {
    if (!this.nodes) return;
    this.wakeupNode = (this.nodes[this.selectedNode].attributes.wake_up_interval === 0 ||
      this.nodes[this.selectedNode].attributes.wake_up_interval);
    if (this.wakeupNode) {
      if (this.nodes[this.selectedNode].attributes.wake_up_interval === 0) this.wakeupInput = '';
      else this.wakeupInput = this.nodes[this.selectedNode].attributes.wake_up_interval;
    }
  }

  computeGetWakeupValue(selectedNode) {
    if (this.selectedNode === -1 ||
      !this.nodes[selectedNode].attributes.wake_up_interval) return 'unknown';
    return (this.nodes[selectedNode].attributes.wake_up_interval);
  }

  computeWakeupServiceData(wakeupInput) {
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      value: wakeupInput
    };
  }

  computeConfigValueHelp(selectedConfigParameter) {
    if (selectedConfigParameter === -1) return '';
    var helpText = this.config[selectedConfigParameter].value.help;
    if (!helpText) return ['No helptext available'];
    return helpText;
  }

  computeSetConfigParameterServiceData(selectedConfigValue) {
    if (this.selectedNode === -1 || this.selectedConfigParameter === -1) return -1;
    var valueData = null;
    if (('Short Byte Int').includes(this.selectedConfigParameterType)) {
      valueData = parseInt(selectedConfigValue, 10);
    } if (('Bool Button').includes(this.selectedConfigParameterType)) {
      valueData = this.selectedConfigParameterValues[selectedConfigValue];
    } if (this.selectedConfigParameterType === 'List') {
      valueData = this.selectedConfigParameterValues[selectedConfigValue];
    }
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      parameter: this.config[this.selectedConfigParameter].key,
      value: valueData
    };
  }

  selectedConfigParameterChanged(selectedConfigParameter) {
    if (selectedConfigParameter === -1) return;
    this.selectedConfigValue = -1;
    this.loadedConfigValue = -1;
    this.selectedConfigParameterValues = [];
    this.selectedConfigParameterType = this.config[selectedConfigParameter].value.type;
    this.configParameterMax = this.config[selectedConfigParameter].value.max;
    this.configParameterMin = this.config[selectedConfigParameter].value.min;
    this.loadedConfigValue = this.config[selectedConfigParameter].value.data;
    this.configValueHelpText = this.config[selectedConfigParameter].value.help;
    if (('Short Byte Int').includes(this.selectedConfigParameterType)) {
      this.selectedConfigParameterNumValues = this.config[selectedConfigParameter].value.data_items;
      this.selectedConfigValue = this.loadedConfigValue;
    }
    if (('Bool Button').includes(this.selectedConfigParameterType)) {
      this.selectedConfigParameterValues = ['True', 'False'];
      if (this.config[selectedConfigParameter].value.data) {
        this.loadedConfigValue = 'True';
      } else this.loadedConfigValue = 'False';
    }
    if (('List').includes(this.selectedConfigParameterType)) {
      this.selectedConfigParameterValues = this.config[selectedConfigParameter].value.data_items;
    }
  }

  isConfigParameterSelected(selectedConfigParameter, type) {
    if (selectedConfigParameter === -1) return false;
    if (this.config[selectedConfigParameter].value.type === type) return true;
    if (type.includes(this.config[selectedConfigParameter].value.type)) return true;
    return false;
  }

  computeSelectCaptionConfigParameter(stateObj) {
    return (stateObj.key + ': ' + stateObj.value.label);
  }

  refreshConfig(selectedNode) {
    var configData = [];
    this.hass.callApi('GET', 'zwave/config/' + this.nodes[selectedNode].attributes.node_id).then(function (config) {
      Object.keys(config).forEach(function (key) {
        configData.push({
          key: key,
          value: config[key],
        });
      });
      this.config = configData;
      this.selectedConfigParameterChanged(this.selectedConfigParameter);
    }.bind(this));
  }
}

customElements.define('zwave-node-config', ZwaveNodeConfig);
