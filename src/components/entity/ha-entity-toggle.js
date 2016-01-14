import hass from '../../util/home-assistant-js-instance';

import Polymer from '../../polymer';

const { serviceActions } = hass;

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
    const curVal = this._checkToggle(this.stateObj);

    if (newVal && !curVal) {
      this._call_service(true);
    } else if (!newVal && curVal) {
      this._call_service(false);
    }
  },

  stateObjChanged(newVal) {
    if (newVal) {
      this.updateToggle(newVal);
    }
  },

  updateToggle(stateObj) {
    this.toggleChecked = this._checkToggle(stateObj);
  },

  forceStateChange() {
    const newState = this._checkToggle(this.stateObj);
    if (this.toggleChecked === newState) {
      this.toggleChecked = !this.toggleChecked;
    }
    this.toggleChecked = newState;
  },

  _checkToggle(stateObj) {
    return stateObj && stateObj.state !== 'off' && stateObj.state !== 'unlocked';
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
    } else {
      domain = 'homeassistant';
      service = turnOn ? 'turn_on' : 'turn_off';
    }

    serviceActions.callService(domain, service, { entity_id: this.stateObj.entityId })
      .then(() => this.forceStateChange());
  },
});
