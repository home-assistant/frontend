import Polymer from '../polymer';

import '../components/state-info';

export default new Polymer({
  is: 'state-card-rollershutter',

  properties: {
    hass: {
      type: Object,
    },

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
    this.hass.serviceActions.callService('rollershutter', 'move_up',
                                         { entity_id: this.stateObj.entityId });
  },

  onMoveDownTap() {
    this.hass.serviceActions.callService('rollershutter', 'move_down',
                                         { entity_id: this.stateObj.entityId });
  },

  onStopTap() {
    this.hass.serviceActions.callService('rollershutter', 'stop',
                                         { entity_id: this.stateObj.entityId });
  },
});
