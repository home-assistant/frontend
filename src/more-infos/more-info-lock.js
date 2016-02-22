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
  },

  handleUnlockTap() {
    this.callService('unlock', { code: this.enteredCode });
  },

  handleLockTap() {
    this.callService('lock', { code: this.enteredCode });
  },

  stateObjChanged(newVal) {
    if (newVal) {
      this.isLocked = newVal.state === 'locked';
    }
    this.async(() => this.fire('iron-resize'), 500);
  },

  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    serviceActions.callService('lock', service, serviceData);
  },
});
