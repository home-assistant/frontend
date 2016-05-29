import Polymer from '../polymer';

import './partial-base';

export default new Polymer({
  is: 'partial-dev-set-state',

  properties: {
    hass: {
      type: Object,
    },

    narrow: {
      type: Boolean,
      value: false,
    },

    showMenu: {
      type: Boolean,
      value: false,
    },

    entityId: {
      type: String,
      value: '',
    },

    state: {
      type: String,
      value: '',
    },

    stateAttributes: {
      type: String,
      value: '',
    },
  },

  setStateData(stateData) {
    const value = stateData ? JSON.stringify(stateData, null, '  ') : '';

    this.$.inputData.value = value;

    // not according to the spec but it works...
    this.$.inputDataWrapper.update(this.$.inputData);
  },

  entitySelected(ev) {
    const state = this.hass.reactor.evaluate(this.hass.entityGetters.byId(ev.detail.entityId));

    this.entityId = state.entityId;
    this.state = state.state;
    this.stateAttributes = JSON.stringify(state.attributes, null, '  ');
  },

  handleSetState() {
    let attr;
    try {
      attr = this.stateAttributes ? JSON.parse(this.stateAttributes) : {};
    } catch (err) {
      /* eslint-disable no-alert */
      alert(`Error parsing JSON: ${err}`);
      /* eslint-enable no-alert */
      return;
    }

    this.hass.entityActions.save({
      entityId: this.entityId,
      state: this.state,
      attributes: attr,
    });
  },

  computeFormClasses(narrow) {
    return `content fit ${narrow ? '' : 'layout horizontal'}`;
  },
});
