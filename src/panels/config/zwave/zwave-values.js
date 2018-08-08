import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-call-service-button.js';

class ZwaveValues extends PolymerElement {
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
      <paper-card heading="Node Values">
        <div class="device-picker">
        <paper-dropdown-menu label="Value" dynamic-align="" class="flex">
          <paper-listbox slot="dropdown-content" selected="{{selectedValue}}">
             <template is="dom-repeat" items="[[values]]" as="item">
              <paper-item>[[computeSelectCaption(item)]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
        </div>
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
      },

      values: {
        type: Array,
      },

      selectedNode: {
        type: Number,
      },

      selectedValue: {
        type: Number,
        value: -1,
        observer: 'selectedValueChanged'
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener('hass-service-called', ev => this.serviceCalled(ev));
  }

  serviceCalled(ev) {
    var foo = this;
    if (ev.detail.success) {
      setTimeout(function () {
        foo.refreshValues(foo.selectedNode);
      }, 5000);
    }
  }

  computeSelectCaption(item) {
    return item.value.label + ' (Instance: ' + item.value.instance + ', Index: ' + item.value.index + ')';
  }

  refreshValues(selectedNode) {
    var valueData = [];
    this.hass.callApi('GET', 'zwave/values/' + this.nodes[selectedNode].attributes.node_id).then(function (values) {
      Object.keys(values).forEach(function (key) {
        valueData.push({
          key: key,
          value: values[key],
        });
      });
      this.values = valueData;
      this.selectedValueChanged(this.selectedValue);
    }.bind(this));
  }

  selectedValueChanged(selectedValue) {
    if (!this.selectedNode === -1 || this.selectedValue === -1) return;
    var el = this;
    this.hass.callApi('GET', 'config/zwave/device_config/' + this.values[selectedValue].value.entity_id)
      .then(function (data) {
        el.entityIgnored = data.ignored || false;
        el.entityPollingIntensity = el.values[selectedValue].value.poll_intensity;
      });
  }
}

customElements.define('zwave-values', ZwaveValues);
