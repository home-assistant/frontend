import { notificationGetters } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

export default new Polymer({
  is: 'notification-manager',

  behaviors: [nuclearObserver],

  properties: {
    text: {
      type: String,
      bindNuclear: notificationGetters.lastNotificationMessage,
      observer: 'showNotification',
    },
  },

  showNotification(newText) {
    if (newText) {
      this.$.toast.show();
    }
  },
});
