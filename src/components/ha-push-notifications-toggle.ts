import { LitElement, TemplateResult, html } from "lit";
import { customElement, property } from "lit/decorators";
import { getAppKey } from "../data/notify_html5";
import { showPromptDialog } from "../dialogs/generic/show-dialog-box";
import { HaSwitch } from "./ha-switch";
import { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";

export const pushSupported =
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  (document.location.protocol === "https:" ||
    document.location.hostname === "localhost" ||
    document.location.hostname === "127.0.0.1");

@customElement("ha-push-notifications-toggle")
class HaPushNotificationsToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public disabled: boolean = false;

  @property() public pushChecked: boolean =
    "Notification" in window && Notification.permission === "granted";

  @property() public loading: boolean = true;

  protected render(): TemplateResult {
    return html`
      <ha-switch
        .disabled=${this._compDisabled(this.disabled, this.loading)}
        .checked=${this.pushChecked}
        @change=${this._handlePushChange}
      ></ha-switch>
    `;
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

  private _handlePushChange(ev: Event) {
    // Somehow this is triggered on Safari on page load causing
    // it to get into a loop and crash the page.
    if (!pushSupported) return;

    const pushnotifications = (ev.target as HaSwitch).checked;
    if (pushnotifications) {
      this.subscribePushNotifications();
    } else {
      this.unsubscribePushNotifications();
    }
  }

  async subscribePushNotifications() {
    const reg = await navigator.serviceWorker.ready;
    let sub;

    try {
      let browserName: string;
      if (navigator.userAgent.toLowerCase().indexOf("firefox") > -1) {
        browserName = "firefox";
      } else {
        browserName = "chrome";
      }

      const name = await showPromptDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.push_notifications.add_device_prompt.title"
        ),
        inputLabel: this.hass.localize(
          "ui.panel.profile.push_notifications.add_device_prompt.input_label"
        ),
      });
      if (name == null) {
        this.pushChecked = false;
        return;
      }

      let applicationServerKey: Uint8Array | null;
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
    } catch (err: any) {
      const message = err.message || "Notification registration failed.";
      if (sub) {
        await sub.unsubscribe();
      }

      // eslint-disable-next-line
      console.error(err);

      fireEvent(this, "hass-notification", { message });
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
    } catch (err: any) {
      const message =
        err.message || "Failed unsubscribing for push notifications.";

      // eslint-disable-next-line
      console.error("Error in unsub push", err);

      fireEvent(this, "hass-notification", { message });
      this.pushChecked = true;
    }
  }

  private _compDisabled(disabled: boolean, loading: boolean) {
    return disabled || loading;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-push-notifications-toggle": HaPushNotificationsToggle;
  }
}
