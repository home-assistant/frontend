import "@polymer/paper-card/paper-card";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/buttons/ha-call-service-button";

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
              <paper-listbox
                slot="dropdown-content"
                selected="{{_selectedValue}}"
              >
                <template is="dom-repeat" items="[[values]]" as="item">
                  <paper-item>[[_computeSelectCaption(item)]]</paper-item>
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
      hass: Object,

      nodes: Array,

      values: Array,

      selectedNode: {
        type: Number,
        observer: "selectedNodeChanged",
      },

      _selectedValue: {
        type: Number,
        value: -1,
        observer: "_selectedValueChanged",
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
        this._refreshValues(this.selectedNode);
      }, 5000);
    }
  }

  _computeSelectCaption(item) {
    return `${item.value.label} (Instance: ${item.value.instance}, Index: ${
      item.value.index
    })`;
  }

  async _refreshValues(selectedNode) {
    const valueData = [];
    const values = await this.hass.callApi(
      "GET",
      `zwave/values/${this.nodes[selectedNode].attributes.node_id}`
    );
    Object.keys(values).forEach((key) => {
      valueData.push({
        key,
        value: values[key],
      });
    });
    this.setProperties({ values: valueData });
    this._selectedValueChanged(this._selectedValue);
  }

  _selectedValueChanged() {}

  selectedNodeChanged(selectedNode) {
    if (selectedNode === -1) return;
    this.setProperties({ _selectedValue: -1 });
  }
}

customElements.define("zwave-values", ZwaveValues);
