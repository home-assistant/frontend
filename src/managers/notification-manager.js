import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

const { notificationGetters } = hass;

export default new Polymer({
  is: 'notification-manager',

  behaviors: [nuclearObserver],

  properties: {
    // Otherwise we cannot close a modal when a notification is being shown.
    neg: {
      type: Boolean,
      value: false,
    },

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
