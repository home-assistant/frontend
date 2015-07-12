import { serviceActions } from 'home-assistant-js';

import Polymer from '../polymer';

require('../components/state-info');

export default Polymer({
  is: 'state-card-toggle',

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
    this.forceStateChange = this.forceStateChange.bind(this);
    this.forceStateChange();
  },

  toggleTapped(ev) {
    ev.stopPropagation();
  },

  toggleChanged(ev) {
    var newVal = ev.target.checked;

    if(newVal && this.stateObj.state === "off") {
      this.turn_on();
    } else if(!newVal && this.stateObj.state === "on") {
      this.turn_off();
    }
  },

  stateObjChanged(newVal) {
    if (newVal) {
      this.updateToggle(newVal);
    }
  },

  updateToggle(stateObj) {
    this.toggleChecked = stateObj && stateObj.state === "on";
  },

  forceStateChange() {
    this.updateToggle(this.stateObj);
  },

  turn_on() {
    // We call updateToggle after a successful call to re-sync the toggle
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    serviceActions.callTurnOn(this.stateObj.entityId).then(this.forceStateChange);
  },

  turn_off() {
    // We call updateToggle after a successful call to re-sync the toggle
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    serviceActions.callTurnOff(this.stateObj.entityId).then(this.forceStateChange);
  },
});
