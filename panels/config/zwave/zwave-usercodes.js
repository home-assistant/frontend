import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-input/paper-input.js';
import '../../../src/components/buttons/ha-call-service-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class ZwaveUsercodes extends PolymerElement {
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
    </style>
      <div class="content">
        <paper-card heading="Node user codes">
          <div class="device-picker">
          <paper-dropdown-menu label="Code slot" dynamic-align="" class="flex">
            <paper-listbox slot="dropdown-content" selected="{{selectedUserCode}}">
              <template is="dom-repeat" items="[[userCodes]]" as="state">
                <paper-item>[[computeSelectCaptionUserCodes(state)]]</paper-item>
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
          </div>

          <template is="dom-if" if="[[isUserCodeSelected(selectedUserCode)]]">
            <div class="card-actions">
              <paper-input label="User code" type="text" allowed-pattern="[0-9,a-f,x,\\\\]" maxlength="{{userCodeMaxLen}}" minlength="16" value="{{selectedUserCodeValue}}">
              </paper-input>
              <pre>Ascii: [[computedCodeOutput]]</pre>
            </div>
            <div class="card-actions">
              <ha-call-service-button hass="[[hass]]" domain="lock" service="set_usercode" service-data="[[computeUserCodeServiceData(selectedUserCodeValue, &quot;Add&quot;)]]">Set Usercode</ha-call-service-button>
              <ha-call-service-button hass="[[hass]]" domain="lock" service="clear_usercode" service-data="[[computeUserCodeServiceData(selectedUserCode, &quot;Delete&quot;)]]">Delete Usercode</ha-call-service-button>
            </div>
          </template>
        </paper-card>
      </div>
`;
  }

  static get is() { return 'zwave-usercodes'; }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      nodes: {
        type: Array,
      },

      selectedNode: {
        type: Number,
      },

      userCodes: {
        type: Object,
      },

      userCodeMaxLen: {
        type: Number,
        value: 4
      },

      selectedUserCode: {
        type: Number,
        value: -1,
        observer: 'selectedUserCodeChanged'
      },

      selectedUserCodeValue: {
        type: String,
      },

      computedCodeOutput: {
        type: String,
        value: ''
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
        foo.refreshUserCodes(foo.selectedNode);
      }, 5000);
    }
  }

  isUserCodeSelected(selectedUserCode) {
    if (selectedUserCode === -1) return false;
    return true;
  }

  computeSelectCaptionUserCodes(stateObj) {
    return (stateObj.key + ': ' + stateObj.value.label);
  }

  selectedUserCodeChanged(selectedUserCode) {
    if (this.selectedUserCode === -1 || selectedUserCode === -1) return;
    var value = this.userCodes[selectedUserCode].value.code;
    this.userCodeMaxLen = (this.userCodes[selectedUserCode].value.length * 4);
    this.selectedUserCodeValue = this.a2hex(value);
    this.computedCodeOutput = '[' + this.hex2a(this.selectedUserCodeValue) + ']';
  }

  computeUserCodeServiceData(selectedUserCodeValue, type) {
    if (this.selectedNode === -1 || !selectedUserCodeValue) return -1;
    var serviceData = null;
    var valueData = null;
    if (type === 'Add') {
      valueData = this.hex2a(selectedUserCodeValue);
      this.computedCodeOutput = '[' + valueData + ']';
      serviceData = {
        node_id: this.nodes[this.selectedNode].attributes.node_id,
        code_slot: this.selectedUserCode,
        usercode: valueData
      };
    }
    if (type === 'Delete') {
      serviceData = {
        node_id: this.nodes[this.selectedNode].attributes.node_id,
        code_slot: this.selectedUserCode
      };
    }
    return serviceData;
  }

  refreshUserCodes(selectedNode) {
    this.selectedUserCodeValue = '';
    var userCodes = [];
    this.hass.callApi('GET', 'zwave/usercodes/' + this.nodes[selectedNode].attributes.node_id).then(function (usercodes) {
      Object.keys(usercodes).forEach(function (key) {
        userCodes.push({
          key: key,
          value: usercodes[key],
        });
      });
      this.userCodes = userCodes;
      this.selectedUserCodeChanged(this.selectedUserCode);
    }.bind(this));
  }

  a2hex(str) {
    var arr = [];
    var output = '';
    for (var i = 0, l = str.length; i < l; i++) {
      var hex = Number(str.charCodeAt(i)).toString(16);
      if (hex === '0') {
        output = '00';
      } else {
        output = hex;
      }
      arr.push('\\x' + output);
    }
    return arr.join('');
  }

  hex2a(hexx) {
    var hex = hexx.toString();
    var hexMod = hex.replace(/\\x/g, '');
    var str = '';
    for (var i = 0; i < hexMod.length; i += 2) {
      str += String.fromCharCode(parseInt(hexMod.substr(i, 2), 16));
    }
    return str;
  }
}

customElements.define(ZwaveUsercodes.is, ZwaveUsercodes);
