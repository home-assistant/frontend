import { serviceActions } from '../../util/home-assistant-js-instance';

import Polymer from '../../polymer';

export default new Polymer({
  is: 'ha-entity-toggle',

  properties: {
    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },

    toggleChecked: {
      type: Boolean,
      value: false,
    },
  },

  ready() {
    this.forceStateChange();
  },

  toggleChanged(ev) {
    const newVal = ev.target.checked;

    if (newVal && this.stateObj.state === 'off') {
      this.turn_on();
    } else if (!newVal && this.stateObj.state !== 'off') {
      this.turn_off();
    }
  },

  stateObjChanged(newVal) {
    if (newVal) {
      this.updateToggle(newVal);
    }
  },

  updateToggle(stateObj) {
    this.toggleChecked = stateObj && stateObj.state !== 'off';
  },

  forceStateChange() {
    this.updateToggle(this.stateObj);
  },

  turn_on() {
    // We call updateToggle after a successful call to re-sync the toggle
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    serviceActions.callTurnOn(this.stateObj.entityId).then(() => this.forceStateChange());
  },

  turn_off() {
    // We call updateToggle after a successful call to re-sync the toggle
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    serviceActions.callTurnOff(this.stateObj.entityId).then(() => this.forceStateChange());
  },
});
