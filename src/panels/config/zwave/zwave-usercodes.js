import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-card";

class ZwaveUsercodes extends PolymerElement {
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
      </style>
      <div class="content">
        <ha-card header="Node user codes">
          <div class="device-picker">
            <paper-dropdown-menu
              label="Code slot"
              dynamic-align=""
              class="flex"
            >
              <paper-listbox
                slot="dropdown-content"
                selected="{{_selectedUserCode}}"
              >
                <template is="dom-repeat" items="[[userCodes]]" as="state">
                  <paper-item
                    >[[_computeSelectCaptionUserCodes(state)]]</paper-item
                  >
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>

          <template is="dom-if" if="[[_isUserCodeSelected(_selectedUserCode)]]">
            <div class="card-actions">
              <paper-input
                label="User code"
                type="text"
                allowed-pattern="[0-9,a-f,x,\\\\]"
                maxlength="40"
                minlength="16"
                value="{{_selectedUserCodeValue}}"
              >
              </paper-input>
              <pre>Ascii: [[_computedCodeOutput]]</pre>
            </div>
            <div class="card-actions">
              <ha-call-service-button
                hass="[[hass]]"
                domain="lock"
                service="set_usercode"
                service-data='[[_computeUserCodeServiceData(_selectedUserCodeValue, "Add")]]'
              >
                Set Usercode
              </ha-call-service-button>
              <ha-call-service-button
                hass="[[hass]]"
                domain="lock"
                service="clear_usercode"
                service-data='[[_computeUserCodeServiceData(_selectedUserCode, "Delete")]]'
              >
                Delete Usercode
              </ha-call-service-button>
            </div>
          </template>
        </ha-card>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      nodes: Array,

      selectedNode: {
        type: Number,
        observer: "_selectedNodeChanged",
      },

      userCodes: Object,

      _selectedUserCode: {
        type: Number,
        value: -1,
        observer: "_selectedUserCodeChanged",
      },

      _selectedUserCodeValue: String,

      _computedCodeOutput: {
        type: String,
        value: "",
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
        this._refreshUserCodes(this.selectedNode);
      }, 5000);
    }
  }

  _isUserCodeSelected(selectedUserCode) {
    if (selectedUserCode === -1) return false;
    return true;
  }

  _computeSelectCaptionUserCodes(stateObj) {
    return `${stateObj.key}: ${stateObj.value.label}`;
  }

  _selectedUserCodeChanged(selectedUserCode) {
    if (this._selectedUserCode === -1 || selectedUserCode === -1) return;
    const value = this.userCodes[selectedUserCode].value.code;
    this.setProperties({
      _selectedUserCodeValue: this._a2hex(value),
      _computedCodeOutput: `[${this._hex2a(this._a2hex(value))}]`,
    });
  }

  _computeUserCodeServiceData(selectedUserCodeValue, type) {
    if (this.selectedNode === -1 || !selectedUserCodeValue) return -1;
    let serviceData = null;
    let valueData = null;
    if (type === "Add") {
      valueData = this._hex2a(selectedUserCodeValue);
      this._computedCodeOutput = `[${valueData}]`;
      serviceData = {
        node_id: this.nodes[this.selectedNode].attributes.node_id,
        code_slot: this._selectedUserCode,
        usercode: valueData,
      };
    }
    if (type === "Delete") {
      serviceData = {
        node_id: this.nodes[this.selectedNode].attributes.node_id,
        code_slot: this._selectedUserCode,
      };
    }
    return serviceData;
  }

  async _refreshUserCodes(selectedNode) {
    this.setProperties({ _selectedUserCodeValue: "" });
    const userCodes = [];
    const userCodeData = await this.hass.callApi(
      "GET",
      `zwave/usercodes/${this.nodes[selectedNode].attributes.node_id}`
    );
    Object.keys(userCodeData).forEach((key) => {
      userCodes.push({
        key,
        value: userCodeData[key],
      });
    });
    this.setProperties({ userCodes: userCodes });
    this._selectedUserCodeChanged(this._selectedUserCode);
  }

  _a2hex(str) {
    const arr = [];
    let output = "";
    for (let i = 0, l = str.length; i < l; i++) {
      const hex = Number(str.charCodeAt(i)).toString(16);
      if (hex === "0") {
        output = "00";
      } else {
        output = hex;
      }
      arr.push("\\x" + output);
    }
    return arr.join("");
  }

  _hex2a(hexx) {
    const hex = hexx.toString();
    const hexMod = hex.replace(/\\x/g, "");
    let str = "";
    for (let i = 0; i < hexMod.length; i += 2) {
      str += String.fromCharCode(parseInt(hexMod.substr(i, 2), 16));
    }
    return str;
  }

  _selectedNodeChanged() {
    if (this.selectedNode === -1) return;
    this.setProperties({ _selecteduserCode: -1 });
  }
}

customElements.define("zwave-usercodes", ZwaveUsercodes);
