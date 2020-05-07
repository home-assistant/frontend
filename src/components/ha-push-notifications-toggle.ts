import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { getAppKey } from "../data/notify_html5";
import { HomeAssistant } from "../types";
import { showPromptDialog } from "../dialogs/generic/show-dialog-box";
import "./ha-switch";

export const pushSupported =
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  (document.location.protocol === "https:" ||
    document.location.hostname === "localhost" ||
    document.location.hostname === "127.0.0.1");

@customElement("ha-push-notifications-toggle")
class HaPushNotificationsToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() private _loading = true;

  @property() private _checked = false;

  protected render(): TemplateResult {
    return html`
      <ha-switch
        .disabled2=${this.disabled || this._loading}
        .checked=${this._checked}
        @change=${this._handlePushChange}
      ></ha-switch>
    `;
  }

  public async connectedCallback() {
    super.connectedCallback();

    this._checked =
      "Notification" in window && Notification.permission === "granted";

    if (!pushSupported) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.pushManager) {
        return;
      }
      reg.pushManager.getSubscription().then((subscription) => {
        this._loading = false;
        this._checked = !!subscription;
      });
    } catch (err) {
      // We don't set loading to `false` so we remain disabled
    }
  }

  private _handlePushChange(ev: CustomEvent) {
    // Somehow this is triggered on Safari on page load causing
    // it to get into a loop and crash the page.
    console.log(ev);
    if (!pushSupported) return;
    console.log(ev);
    console.log(this._checked);
    if (ev.target.checked) {
      this.subscribePushNotifications();
    } else {
      this.unsubscribePushNotifications();
    }
  }

  async subscribePushNotifications() {
    const reg = await navigator.serviceWorker.ready;
    let sub: PushSubscription;

    try {
      let browserName;
      if (navigator.userAgent.toLowerCase().indexOf("firefox") > -1) {
        browserName = "firefox";
      } else {
        browserName = "chrome";
      }

      const name = await showPromptDialog(this, {
        title: "Name",
        text: "What should this device be called?",
      });

      if (name === null || !name) {
        this._checked = false;
        return;
      }

      let applicationServerKey: Uint8Array | null;
      try {
        applicationServerKey = await getAppKey(this.hass);
      } catch (ex) {
        applicationServerKey = null;
      }
      console.log("Got here!");

      if (applicationServerKey) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } else {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true });
      }

      console.log("Got here!");

      await this.hass.callApi("POST", "notify.html5", {
        subscription: sub,
        browser: browserName,
        name,
      });
    } catch (err) {
      const message = err.message || "Notification registration failed.";
      if (sub!) {
        await sub!.unsubscribe();
      }

      // eslint-disable-next-line
      console.error(err);

      //this.fire("hass-notification", { message });
      console.log("err Got here!");
      this._checked = false;
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
      this._checked = true;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-push-notifications-toggle": HaPushNotificationsToggle;
  }
}
