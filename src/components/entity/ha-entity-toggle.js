import Polymer from '../../polymer';

import hass from '../../util/home-assistant-js-instance';
import OFF_STATES from '../../util/off-states';

const { serviceActions } = hass;

export default new Polymer({
  is: 'ha-entity-toggle',

  properties: {
    stateObj: {
      type: Object,
    },

    toggleChecked: {
      type: Boolean,
      value: false,
    },

    isOn: {
      type: Boolean,
      computed: 'computeIsOn(stateObj)',
      observer: 'isOnChanged',
    },
  },

  ready() {
    this.forceStateChange();
  },

  toggleChanged(ev) {
    const newVal = ev.target.checked;

    if (newVal && !this.isOn) {
      this._call_service(true);
    } else if (!newVal && this.isOn) {
      this._call_service(false);
    }
  },

  isOnChanged(newVal) {
    this.toggleChecked = newVal;
  },

  forceStateChange() {
    if (this.toggleChecked === this.isOn) {
      this.toggleChecked = !this.toggleChecked;
    }
    this.toggleChecked = this.isOn;
  },

  turnOn() {
    this._call_service(true);
  },

  turnOff() {
    this._call_service(false);
  },

  computeIsOn(stateObj) {
    return stateObj && OFF_STATES.indexOf(stateObj.state) === -1;
  },

  // We call updateToggle after a successful call to re-sync the toggle
  // with the state. It will be out of sync if our service call did not
  // result in the entity to be turned on. Since the state is not changing,
  // the resync is not called automatic.
  _call_service(turnOn) {
    let domain;
    let service;

    if (this.stateObj.domain === 'lock') {
      domain = 'lock';
      service = turnOn ? 'lock' : 'unlock';
    } else if (this.stateObj.domain === 'garage_door') {
      domain = 'garage_door';
      service = turnOn ? 'open' : 'close';
    } else {
      domain = 'homeassistant';
      service = turnOn ? 'turn_on' : 'turn_off';
    }

    const call = serviceActions.callService(
      domain, service, { entity_id: this.stateObj.entityId });

    if (!this.stateObj.attributes.assumed_state) {
      call.then(() => this.forceStateChange());
    }
  },
});
