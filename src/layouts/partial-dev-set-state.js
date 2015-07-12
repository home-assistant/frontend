import { reactor, entityGetters, entityActions } from 'home-assistant-js';

import Polymer from '../polymer';

require('./partial-base');
require('../components/entity-list');

export default Polymer({
  is: 'partial-dev-set-state',

  properties: {
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
    var value = stateData ? JSON.stringify(stateData, null, '  ') : "";

    this.$.inputData.value = value;

    // not according to the spec but it works...
    this.$.inputDataWrapper.update(this.$.inputData);
  },

  entitySelected(ev) {
    var state = reactor.evaluate(entityGetters.byId(ev.detail.entityId));

    this.entityId = state.entityId;
    this.state = state.state;
    this.stateAttributes = JSON.stringify(state.attributes, null, '  ');
  },

  handleSetState() {
    var attr;
    try {
      attr = this.stateAttributes ? JSON.parse(this.stateAttributes) : {};
    } catch (err) {
      alert("Error parsing JSON: " + err);
      return;
    }

    entityActions.save({
      entityId: this.entityId,
      state: this.state,
      attributes: attr,
    });
  },

  computeFormClasses(narrow) {
    return 'layout ' + (narrow ? 'vertical' : 'horizontal');
  },
});
