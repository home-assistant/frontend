import { moreInfoActions } from 'home-assistant-js';

import Polymer from '../polymer';

export default Polymer({
  is: 'logbook-entry',

  entityClicked: function(ev) {
    ev.preventDefault();
    moreInfoActions.selectEntity(this.entryObj.entityId);
  }
});
