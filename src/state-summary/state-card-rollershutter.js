import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

require('../components/state-info');

const { serviceActions } = hass;

export default new Polymer({
  is: 'state-card-rollershutter',

  properties: {
    inDialog: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
    },
  },

  computeIsFullyOpen(stateObj) {
    return stateObj.attributes.current_position === 100;
  },

  computeIsFullyClosed(stateObj) {
    return stateObj.attributes.current_position === 0;
  },

  onMoveUpTap() {
    serviceActions.callService('rollershutter', 'move_up',
                               { entity_id: this.stateObj.entityId });
  },

  onMoveDownTap() {
    serviceActions.callService('rollershutter', 'move_down',
                               { entity_id: this.stateObj.entityId });
  },

  onStopTap() {
    serviceActions.callService('rollershutter', 'stop',
                               { entity_id: this.stateObj.entityId });
  },
});
