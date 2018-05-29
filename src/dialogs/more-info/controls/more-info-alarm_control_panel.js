import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import EventsMixin from '../../../mixins/events-mixin.js';

class MoreInfoAlarmControlPanel extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style is="custom-style" include="iron-flex"></style>
      <style>
        .pad {
          display: flex;
          justify-content: center;
          margin-bottom: 10%;
        }
        .pad div {
          display: flex;
          flex-direction: column;
        }
      </style>

      <div class='layout horizontal center-justified'>
        <paper-input label="code" value="{{enteredCode}}" pattern="[[codeFormat]]" type="password" hidden\$="[[!codeFormat]]" disabled="[[!codeInputEnabled]]"></paper-input>
      </div>

      <template is="dom-if" if="[[numericPin]]">
        <div class="pad">
          <div>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="1" raised>1</paper-button>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="4" raised>4</paper-button>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="7" raised>7</paper-button>
          </div>
          <div>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="2" raised>2</paper-button>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="5" raised>5</paper-button>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="8" raised>8</paper-button>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="0" raised>0</paper-button>
          </div>
          <div>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="3" raised>3</paper-button>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="6" raised>6</paper-button>
            <paper-button on-click='numberPadClicked' disabled='[[!codeInputEnabled]]' data-digit="9" raised>9</paper-button>
            <paper-button on-click='clearCode' disabled='[[!codeInputEnabled]]' raised>Clear</paper-button>
          </div>
        </div>
      </template>

      <div class="layout horizontal">
        <paper-button on-click="handleDisarmTap" hidden\$="[[!disarmButtonVisible]]" disabled="[[!codeValid]]">Disarm</paper-button>
        <paper-button on-click="handleHomeTap" hidden\$="[[!armHomeButtonVisible]]" disabled="[[!codeValid]]">Arm Home</paper-button>
        <paper-button on-click="handleAwayTap" hidden\$="[[!armAwayButtonVisible]]" disabled="[[!codeValid]]">Arm Away</paper-button>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: 'stateObjChanged',
      },
      enteredCode: {
        type: String,
        value: '',
      },
      numericPin: {
        type: Boolean,
        value: false,
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
        numericPin: newVal.attributes.code_format === '^\\d+$',
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

  numberPadClicked(ev) {
    this.enteredCode += ev.target.getAttribute('data-digit');
  }

  clearCode() {
    this.enteredCode = '';
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

customElements.define('more-info-alarm_control_panel', MoreInfoAlarmControlPanel);