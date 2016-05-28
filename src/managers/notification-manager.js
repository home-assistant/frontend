import Polymer from '../polymer';

export default new Polymer({
  is: 'notification-manager',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    // Otherwise we cannot close a modal when a notification is being shown.
    neg: {
      type: Boolean,
      value: false,
    },

    text: {
      type: String,
      bindNuclear: hass => hass.notificationGetters.lastNotificationMessage,
      observer: 'showNotification',
    },
  },

  showNotification(newText) {
    if (newText) {
      this.$.toast.show();
    }
  },
});
