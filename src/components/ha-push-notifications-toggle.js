import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { getAppKey } from "../data/notify_html5";
import { EventsMixin } from "../mixins/events-mixin";

import "./ha-switch";

export const pushSupported =
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  !("externalApp" in window) &&
  (document.location.protocol === "https:" ||
    document.location.hostname === "localhost" ||
    document.location.hostname === "127.0.0.1");

/*
 * @appliesMixin EventsMixin
 */
class HaPushNotificationsToggle extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <ha-switch
        disabled="[[_compDisabled(disabled, loading)]]"
        checked="{{pushChecked}}"
        on-change="handlePushChange"
      ></ha-switch>
    `;
  }

  static get properties() {
    return {
      hass: { type: Object, value: null },
      disabled: {
        type: Boolean,
        value: false,
      },
      pushChecked: {
        type: Boolean,
        value:
          "Notification" in window && Notification.permission === "granted",
      },
      loading: {
        type: Boolean,
        value: true,
      },
    };
  }

  async connectedCallback() {
    super.connectedCallback();

    if (!pushSupported) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.pushManager) {
        return;
      }
      reg.pushManager.getSubscription().then((subscription) => {
        this.loading = false;
        this.pushChecked = !!subscription;
      });
    } catch (err) {
      // We don't set loading to `false` so we remain disabled
    }
  }

  handlePushChange(event) {
    // Somehow this is triggered on Safari on page load causing
    // it to get into a loop and crash the page.
    if (!pushSupported) return;

    if (event.target.checked) {
      this.subscribePushNotifications();
    } else {
      this.unsubscribePushNotifications();
    }
  }

  async subscribePushNotifications() {
    const reg = await navigator.serviceWorker.ready;
    let sub;

    try {
      let browserName;
      if (navigator.userAgent.toLowerCase().indexOf("firefox") > -1) {
        browserName = "firefox";
      } else {
        browserName = "chrome";
      }

      const name = prompt("What should this device be called ?");
      if (name == null) {
        this.pushChecked = false;
        return;
      }

      let applicationServerKey;
      try {
        applicationServerKey = await getAppKey(this.hass);
      } catch (ex) {
        applicationServerKey = null;
      }

      if (applicationServerKey) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } else {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true });
      }

      await this.hass.callApi("POST", "notify.html5", {
        subscription: sub,
        browser: browserName,
        name,
      });
    } catch (err) {
      const message = err.message || "Notification registration failed.";
      if (sub) {
        await sub.unsubscribe();
      }

      // eslint-disable-next-line
      console.error(err);

      this.fire("hass-notification", { message });
      this.pushChecked = false;
    }
  }

  async unsubscribePushNotifications() {
    const reg = await navigator.serviceWorker.ready;

    try {
      const sub = await reg.pushManager.getSubscription();

      if (!sub) return;

      await this.hass.callApi("DELETE", "notify.html5", { subscription: sub });
      await sub.unsubscribe();
    } catch (err) {
      const message =
        err.message || "Failed unsubscribing for push notifications.";

      // eslint-disable-next-line
      console.error("Error in unsub push", err);

      this.fire("hass-notification", { message });
      this.pushChecked = true;
    }
  }

  _compDisabled(disabled, loading) {
    return disabled || loading;
  }
}

customElements.define(
  "ha-push-notifications-toggle",
  HaPushNotificationsToggle
);
