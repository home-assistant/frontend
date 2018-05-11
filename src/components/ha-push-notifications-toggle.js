import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';
import '../util/hass-mixins.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HaPushNotificationsToggle extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <paper-toggle-button hidden\$="[[!pushSupported]]" disabled="[[loading]]" checked="{{pushChecked}}"></paper-toggle-button>
`;
  }

  static get is() { return 'ha-push-notifications-toggle'; }

  static get properties() {
    return {
      hass: { type: Object, value: null },
      pushSupported: {
        type: Boolean,
        readOnly: true,
        notify: true,
        value: (
          'serviceWorker' in navigator && 'PushManager' in window &&
            (document.location.protocol === 'https:' ||
              document.location.hostname === 'localhost' ||
              document.location.hostname === '127.0.0.1')
        )
      },
      pushChecked: {
        type: Boolean,
        value: 'Notification' in window && Notification.permission === 'granted',
        observer: 'handlePushChange',
      },
      loading: {
        type: Boolean,
        value: true,
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.pushSupported) return;

    navigator.serviceWorker.ready.then(
      (reg) => {
        reg.pushManager.getSubscription().then((subscription) => {
          this.loading = false;
          this.pushChecked = !!subscription;
        });
      },
      () => {
        // no service worker.
        this._setPushSupported(false);
      }
    );
  }
  handlePushChange(pushChecked) {
    if (!this.pushSupported) return;
    if (pushChecked) {
      this.subscribePushNotifications();
    } else {
      this.unsubscribePushNotifications();
    }
  }
  subscribePushNotifications() {
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.subscribe({ userVisibleOnly: true }))
      .then(
        (sub) => {
          let browserName;
          if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
            browserName = 'firefox';
          } else {
            browserName = 'chrome';
          }

          return this.hass.callApi('POST', 'notify.html5', {
            subscription: sub,
            browser: browserName
          });
        },
        (err) => {
          let message;
          if (err.message && err.message.indexOf('gcm_sender_id') !== -1) {
            message = 'Please setup the notify.html5 platform.';
          } else {
            message = 'Notification registration failed.';
          }

          /* eslint-disable no-console */
          console.error(err);
          /* eslint-enable no-console */

          this.fire('hass-notification', { message: message });
          this.pushChecked = false;
        }
      );
  }
  unsubscribePushNotifications() {
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) return Promise.resolve();

        return this.hass
          .callApi('DELETE', 'notify.html5', { subscription: sub })
          .then(() => {
            sub.unsubscribe();
          });
      })
      .catch((err) => {
        /* eslint-disable no-console */
        console.error('Error in unsub push', err);
        /* eslint-enable no-console */

        this.fire('hass-notification', {
          message: 'Failed unsubscribing for push notifications.'
        });
      });
  }
}

customElements.define(HaPushNotificationsToggle.is, HaPushNotificationsToggle);
