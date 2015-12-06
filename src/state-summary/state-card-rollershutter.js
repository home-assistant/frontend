import { serviceActions } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

require('../components/state-info');

export default new Polymer({
  is: 'state-card-rollershutter',

  properties: {
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
                               {entity_id: this.stateObj.entityId});
  },

  onMoveDownTap() {
    serviceActions.callService('rollershutter', 'move_down',
                               {entity_id: this.stateObj.entityId});
  },

  onStopTap() {
    serviceActions.callService('rollershutter', 'stop',
                               {entity_id: this.stateObj.entityId});
  },
});
