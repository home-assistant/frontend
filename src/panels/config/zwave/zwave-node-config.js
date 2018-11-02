import "@polymer/paper-card/paper-card";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/buttons/ha-call-service-button";

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
        <template is="dom-if" if="[[_wakeupNode]]">
          <div class="card-actions">
            <paper-input
              float-label="Wakeup Interval"
              type="number"
              value="{{_wakeupInput}}"
              placeholder="[[_computeGetWakeupValue(selectedNode)]]">
              <div suffix="">seconds</div>
            </paper-input>
            <ha-call-service-button
              hass="[[hass]]"
              domain="zwave"
              service="set_wakeup"
              service-data="[[_computeWakeupServiceData(_wakeupInput)]]">
              Set Wakeup
            </ha-call-service-button>
          </div>
        </template>
        <div class="device-picker">
        <paper-dropdown-menu label="Config parameter" dynamic-align="" class="flex">
          <paper-listbox slot="dropdown-content" selected="{{_selectedConfigParameter}}">
            <template is="dom-repeat" items="[[config]]" as="state">
              <paper-item>[[_computeSelectCaptionConfigParameter(state)]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
        </div>
        <template is="dom-if" if="[[_isConfigParameterSelected(_selectedConfigParameter, 'List')]]">
          <div class="device-picker">
            <paper-dropdown-menu label="Config value" dynamic-align="" class="flex" placeholder="{{_loadedConfigValue}}">
              <paper-listbox slot="dropdown-content" selected="{{_selectedConfigValue}}">
                <template is="dom-repeat" items="[[_selectedConfigParameterValues]]" as="state">
                  <paper-item>[[state]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
        </template>

        <template is="dom-if" if="[[_isConfigParameterSelected(_selectedConfigParameter, 'Byte Short Int')]]">
          <div class="card-actions">
            <paper-input
              label="{{_selectedConfigParameterNumValues}}"
              type="number"
              value="{{_selectedConfigValue}}"
              max="{{_configParameterMax}}"
              min="{{_configParameterMin}}">
            </paper-input>
          </div>
        </template>
        <template is="dom-if" if="[[_isConfigParameterSelected(_selectedConfigParameter, 'Bool Button')]]">
          <div class="device-picker">
            <paper-dropdown-menu label="Config value" class="flex" dynamic-align="" placeholder="{{_loadedConfigValue}}">
              <paper-listbox slot="dropdown-content" selected="{{_selectedConfigValue}}">
                <template is="dom-repeat" items="[[_selectedConfigParameterValues]]" as="state">
                  <paper-item>[[state]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
        </template>
        <div class="help-text">
          <span>[[_configValueHelpText]]</span>
        </div>
        <template is="dom-if" if="[[_isConfigParameterSelected(_selectedConfigParameter, 'Bool Button Byte Short Int List')]]">
          <div class="card-actions">
            <ha-call-service-button
              hass="[[hass]]"
              domain="zwave"
              service="set_config_parameter"
              service-data="[[_computeSetConfigParameterServiceData(_selectedConfigValue)]]">
              Set Config Parameter
            </ha-call-service-button>
          </div>
        </template>
      </paper-card>
    </div>
`;
  }

  static get properties() {
    return {
      hass: Object,

      nodes: Array,

      selectedNode: {
        type: Number,
        observer: "_nodesChanged",
      },

      config: {
        type: Array,
        value: () => [],
      },

      _selectedConfigParameter: {
        type: Number,
        value: -1,
        observer: "_selectedConfigParameterChanged",
      },

      _configParameterMax: {
        type: Number,
        value: -1,
      },

      _configParameterMin: {
        type: Number,
        value: -1,
      },

      _configValueHelpText: {
        type: String,
        value: "",
        computed: "_computeConfigValueHelp(_selectedConfigParameter)",
      },

      _selectedConfigParameterType: {
        type: String,
        value: "",
      },

      _selectedConfigValue: {
        type: Number,
        value: -1,
        observer: "_computeSetConfigParameterServiceData",
      },

      _selectedConfigParameterValues: {
        type: Array,
        value: () => [],
      },

      _selectedConfigParameterNumValues: {
        type: String,
        value: "",
      },

      _loadedConfigValue: {
        type: Number,
        value: -1,
      },

      _wakeupInput: Number,

      _wakeupNode: {
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
    if (ev.detail.success) {
      setTimeout(() => {
        this._refreshConfig(this.selectedNode);
      }, 5000);
    }
  }

  _nodesChanged() {
    if (!this.nodes) return;
    this.setProperties({ _selectedConfigParameter: -1 });
    this._wakeupNode =
      this.nodes[this.selectedNode].attributes.wake_up_interval === 0 ||
      this.nodes[this.selectedNode].attributes.wake_up_interval;
    if (this._wakeupNode) {
      if (this.nodes[this.selectedNode].attributes.wake_up_interval === 0)
        this.setProperties({ _wakeupInput: "" });
      else {
        this.setProperties({
          _wakeupInput: this.nodes[this.selectedNode].attributes
            .wake_up_interval,
        });
      }
    }
  }

  _computeGetWakeupValue(selectedNode) {
    if (
      this.selectedNode === -1 ||
      !this.nodes[selectedNode].attributes.wake_up_interval
    )
      return "unknown";
    return this.nodes[selectedNode].attributes.wake_up_interval;
  }

  _computeWakeupServiceData(wakeupInput) {
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      value: wakeupInput,
    };
  }

  _computeConfigValueHelp(selectedConfigParameter) {
    if (selectedConfigParameter === -1) return "";
    const helpText = this.config[selectedConfigParameter].value.help;
    if (!helpText) return ["No helptext available"];
    return helpText;
  }

  _computeSetConfigParameterServiceData(selectedConfigValue) {
    if (this.selectedNode === -1 || this._selectedConfigParameter === -1)
      return -1;
    var valueData = null;
    if ("Short Byte Int".includes(this._selectedConfigParameterType)) {
      valueData = parseInt(selectedConfigValue, 10);
    }
    if ("Bool Button List".includes(this._selectedConfigParameterType)) {
      valueData = this._selectedConfigParameterValues[selectedConfigValue];
    }
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      parameter: this.config[this._selectedConfigParameter].key,
      value: valueData,
    };
  }

  _selectedConfigParameterChanged(selectedConfigParameter) {
    if (selectedConfigParameter === -1) return;
    this.setProperties({
      _selectedConfigValue: -1,
      _loadedConfigValue: -1,
      _selectedConfigParameterValues: [],
    });
    this.setProperties({
      _selectedConfigParameterType: this.config[selectedConfigParameter].value
        .type,
      _configParameterMax: this.config[selectedConfigParameter].value.max,
      _configParameterMin: this.config[selectedConfigParameter].value.min,
      _loadedConfigValue: this.config[selectedConfigParameter].value.data,
      _configValueHelpText: this.config[selectedConfigParameter].value.help,
    });
    if ("Short Byte Int".includes(this._selectedConfigParameterType)) {
      this.setProperties({
        _selectedConfigParameterNumValues: this.config[selectedConfigParameter]
          .value.data_items,
        _selectedConfigValue: this._loadedConfigValue,
      });
    }
    if ("Bool Button".includes(this._selectedConfigParameterType)) {
      this.setProperties({ _selectedConfigParameterValues: ["True", "False"] });
      if (this.config[selectedConfigParameter].value.data) {
        this.setProperties({ _loadedConfigValue: "True" });
      } else this.setProperties({ _loadedConfigValue: "False" });
    }
    if ("List".includes(this._selectedConfigParameterType)) {
      this.setProperties({
        _selectedConfigParameterValues: this.config[selectedConfigParameter]
          .value.data_items,
      });
    }
  }

  _isConfigParameterSelected(selectedConfigParameter, type) {
    if (selectedConfigParameter === -1) return false;
    if (this.config[selectedConfigParameter].value.type === type) return true;
    if (type.includes(this.config[selectedConfigParameter].value.type))
      return true;
    return false;
  }

  _computeSelectCaptionConfigParameter(stateObj) {
    return `${stateObj.key}: ${stateObj.value.label}`;
  }

  async _refreshConfig(selectedNode) {
    const configData = [];
    const config = await this.hass.callApi(
      "GET",
      `zwave/config/${this.nodes[selectedNode].attributes.node_id}`
    );
    Object.keys(config).forEach((key) => {
      configData.push({
        key: key,
        value: config[key],
      });
    });
    this.setProperties({ config: configData });
    this._selectedConfigParameterChanged(this._selectedConfigParameter);
  }
}

customElements.define("zwave-node-config", ZwaveNodeConfig);
