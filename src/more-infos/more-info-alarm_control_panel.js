import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

const { serviceActions } = hass;

export default new Polymer({
  is: 'more-info-alarm_control_panel',
  handleDisarmTap() {
    this.callService('alarm_disarm', {code: this.enteredCode});
  },
  handleHomeTap() {
    this.callService('alarm_arm_home', {code: this.enteredCode});
  },
  handleAwayTap() {
    this.callService('alarm_arm_away', {code: this.enteredCode});
  },
  properties: {
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
    codeInputVisible: {
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
  },
  validateCode(code, format) {
    const re = new RegExp(format);
    if (format === null) {
      return true;
    }
    return re.test(code);
  },
  stateObjChanged(newVal) {
    if (newVal) {
      this.codeFormat = newVal.attributes.code_format;
      this.codeInputVisible = this.codeFormat !== null;
      this.codeInputEnabled = (
        newVal.state === 'armed_home' ||
	newVal.state === 'armed_away' ||
	newVal.state === 'disarmed' ||
	newVal.state === 'pending' ||
	newVal.state === 'triggered');
      this.disarmButtonVisible = (
	newVal.state === 'armed_home' ||
	newVal.state === 'armed_away' ||
	newVal.state === 'pending' ||
	newVal.state === 'triggered');
      this.armHomeButtonVisible = newVal.state === 'disarmed';
      this.armAwayButtonVisible = newVal.state === 'disarmed';
    }
    this.async(() => this.fire('iron-resize'), 500);
  },
  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    serviceActions.callService('alarm_control_panel', service, serviceData);
  },
});
