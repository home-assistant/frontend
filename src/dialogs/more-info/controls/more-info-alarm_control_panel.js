import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../util/hass-mixins.js';

class MoreInfoAlarmControlPanel extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex"></style>

    <div class="layout horizontal">
      <paper-input label="code" value="{{enteredCode}}" pattern="[[codeFormat]]" type="password" hidden\$="[[!codeFormat]]" disabled="[[!codeInputEnabled]]"></paper-input>
    </div>
    <div class="layout horizontal">
      <paper-button on-click="handleDisarmTap" hidden\$="[[!disarmButtonVisible]]" disabled="[[!codeValid]]">Disarm</paper-button>
      <paper-button on-click="handleHomeTap" hidden\$="[[!armHomeButtonVisible]]" disabled="[[!codeValid]]">Arm Home</paper-button>
      <paper-button on-click="handleAwayTap" hidden\$="[[!armAwayButtonVisible]]" disabled="[[!codeValid]]">Arm Away</paper-button>
    </div>
`;
  }

  static get is() { return 'more-info-alarm_control_panel'; }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      stateObj: {
        type: Object,
        observer: 'stateObjChanged',
      },
      enteredCode: {
        type: String,
        value: '',
      },
      disarmButtonVisible: {
        type: Boolean,
        value: false,
      },
      armHomeButtonVisible: {
        type: Boolean,
        value: false,
      },
      armAwayButtonVisible: {
        type: Boolean,
        value: false,
      },
      codeInputEnabled: {
        type: Boolean,
        value: false,
      },
      codeFormat: {
        type: String,
        value: '',
      },
      codeValid: {
        type: Boolean,
        computed: 'validateCode(enteredCode, codeFormat)',
      },
    };
  }

  validateCode(code, format) {
    var re = new RegExp(format);
    if (format === null) {
      return true;
    }
    return re.test(code);
  }

  stateObjChanged(newVal, oldVal) {
    if (newVal) {
      const props = {
        codeFormat: newVal.attributes.code_format,
        armHomeButtonVisible: newVal.state === 'disarmed',
        armAwayButtonVisible: newVal.state === 'disarmed',
      };
      props.disarmButtonVisible = (
        newVal.state === 'armed_home' ||
        newVal.state === 'armed_away' ||
        newVal.state === 'armed_night' ||
        newVal.state === 'armed_custom_bypass' ||
        newVal.state === 'pending' ||
        newVal.state === 'triggered');
      props.codeInputEnabled = props.disarmButtonVisible || newVal.state === 'disarmed';
      this.setProperties(props);
    }
    if (oldVal) {
      setTimeout(() => {
        this.fire('iron-resize');
      }, 500);
    }
  }

  handleDisarmTap() {
    this.callService('alarm_disarm', { code: this.enteredCode });
  }

  handleHomeTap() {
    this.callService('alarm_arm_home', { code: this.enteredCode });
  }

  handleAwayTap() {
    this.callService('alarm_arm_away', { code: this.enteredCode });
  }

  callService(service, data) {
    var serviceData = data || {};
    serviceData.entity_id = this.stateObj.entity_id;
    this.hass.callService('alarm_control_panel', service, serviceData)
      .then(function () {
        this.enteredCode = '';
      }.bind(this));
  }
}

customElements.define(MoreInfoAlarmControlPanel.is, MoreInfoAlarmControlPanel);
