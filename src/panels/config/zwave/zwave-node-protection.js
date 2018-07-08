import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-call-api-button.js';

class ZwaveProtectionConfig extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .card-actions.warning ha-call-api-button {
        color: var(--google-red-500);
      }
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

    </style>
      <div class="content">
        <paper-card heading="Node protection">
          <div class="device-picker">
          <paper-dropdown-menu label="Protection" dynamic-align="" class="flex" placeholder="{{_loadedProtectionValue}}">
            <paper-listbox slot="dropdown-content" selected="{{_selectedProtectionParameter}}">
              <template is="dom-repeat" items="[[_protectionOptions]]" as="state">
                <paper-item>[[state]]</paper-item>
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
          </div>
          <div class="card-actions">
            <ha-call-api-button hass="[[hass]]" path="[[_nodePath]]" data="[[_protectionData]]">Set Protection</ha-call-service-button>
          </div>
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

      protectionNode: {
        type: Boolean,
        value: false,
      },

      _protectionValueID: {
        type: Number,
        value: -1,
      },

      _selectedProtectionParameter: {
        type: Number,
        value: -1,
        observer: 'computeProtectionData',
      },

      _protectionOptions: {
        type: Array,
      },

      _protection: {
        type: Array,
        value: function () {
          return [];
        }
      },

      _loadedProtectionValue: {
        type: String,
        value: ''
      },

      _protectionData: {
        type: Object,
        value: { },
      },

      _nodePath: {
        type: String,
      }
    };
  }

  ready() {
    super.ready();
    this.addEventListener('hass-api-called', ev => this.apiCalled(ev));
  }

  apiCalled(ev) {
    if (ev.detail.success) {
      setTimeout(() => {
        this.refreshProtection(this.selectedNode);
      }, 5000);
    }
  }


  nodesChanged() {
    if (!this.nodes) return;
    if (this._protection) {
      if (this._protection[0] === undefined) { return; }
      this.protectionNode = true;
      this._protectionOptions = this._protection[0].value;
      this._loadedProtectionValue = this._protection[1].value;
      this._protectionValueID = this._protection[2].value;
    }
  }

  async refreshProtection(selectedNode) {
    const protectionValues = [];
    const protections = await this.hass.callApi('GET', 'zwave/protection/' + this.nodes[selectedNode].attributes.node_id);
    Object.keys(protections).forEach(function (key) {
      protectionValues.push({
        key: key,
        value: protections[key],
      });
    });
    this._protection = protectionValues;
    this._selectedProtectionParameter = -1;
    this._loadedProtectionValue = this._protection[1].value;
  }

  computeProtectionData(selectedProtectionParameter) {
    if (this.selectedNode === -1 || selectedProtectionParameter === -1) return;
    this._protectionData = {
      selection: this._protectionOptions[selectedProtectionParameter],
      value_id: this._protectionValueID
    };
    this._nodePath = 'zwave/protection/' + this.nodes[this.selectedNode].attributes.node_id;
  }
}

customElements.define('zwave-node-protection', ZwaveProtectionConfig);
