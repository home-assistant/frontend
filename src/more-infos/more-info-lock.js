import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

const { serviceActions } = hass;

export default new Polymer({
  is: 'more-info-lock',
  properties: {
    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },
    enteredCode: {
      type: String,
      value: '',
    },
    unlockButtonVisible: {
      type: Boolean,
      value: false,
    },
    lockButtonVisible: {
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
  handleUnlockTap() {
    this.callService('unlock', { code: this.enteredCode });
  },
  handleLockTap() {
    this.callService('lock', { code: this.enteredCode });
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
        newVal.state === 'locked' ||
	newVal.state === 'unlocked');
      this.unlockButtonVisible = (
	newVal.state === 'locked');
      this.lockButtonVisible = newVal.state === 'unlocked';
    }
    this.async(() => this.fire('iron-resize'), 500);
  },
  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    serviceActions.callService('lock', service, serviceData);
  },
});
