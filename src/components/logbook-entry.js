import { moreInfoActions } from 'home-assistant-js';

import Polymer from '../polymer';

require('./domain-icon');
require('./display-time');
require('./relative-ha-datetime');

export default Polymer({
  is: 'logbook-entry',

  entityClicked: function(ev) {
    ev.preventDefault();
    moreInfoActions.selectEntity(this.entryObj.entityId);
  }
});
