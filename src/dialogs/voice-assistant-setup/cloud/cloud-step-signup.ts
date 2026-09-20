import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-spinner";
import type { CloudAutoLogin, CloudStatus } from "../../../data/cloud";
import {
  cancelCloudAutoLogin,
  cloudStatusAutoLogin,
  fetchCloudStatus,
  subscribeCloudEvents,
} from "../../../data/cloud";
import "../../../panels/config/cloud/register/cloud-register-card";
import type { HomeAssistant } from "../../../types";
import { AssistantSetupStyles } from "../styles";

@customElement("cloud-step-signup")
export class CloudStepSignup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _autoLogin: CloudAutoLogin | null = null;

  @state() private _loading = true;

  private _email?: string;

  private _unsubCloudEvents?: Promise<UnsubscribeFunc>;

  private _statusRead: Promise<void> = Promise.resolve();

  private _wasLoggedIn?: boolean;

  public connectedCallback(): void {
    super.connectedCallback();
    this._watchCloudStatus();
    this._loadInitialStatus();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubCloudEvents?.then((unsub) => unsub()).catch(() => undefined);
    this._unsubCloudEvents = undefined;
  }

  render() {
    return html`<div class="content">
      <img
        src=${`/static/images/logo_nabu_casa${this.hass.themes?.darkMode ? "_dark" : ""}.png`}
        alt="Nabu Casa logo"
      />
      ${
        this._loading
          ? html`<div class="loading"><ha-spinner></ha-spinner></div>`
          : html`<cloud-register-card
              card-less
              .hass=${this.hass}
              .autoLogin=${this._autoLogin}
              @cloud-email-changed=${this._emailChanged}
              @cloud-sign-in-instead=${this._signIn}
              @cloud-cancel-auto-login=${this._cancelAutoLogin}
              @ha-refresh-cloud-status=${this._refreshCloudStatus}
            ></cloud-register-card>`
      }
    </div>`;
  }

  // The cloud panel is fed status by ha-panel-config; this dialog is mounted at
  // the root, outside it, so the step does the watching. Every cloud event means
  // one thing here — the state moved, read it back — because cloud/status holds
  // everything the events carry.
  private _watchCloudStatus() {
    if (this._unsubCloudEvents) {
      return;
    }

    const subscription = subscribeCloudEvents(this.hass, () => {
      this._refreshCloudStatus();
    });
    this._unsubCloudEvents = subscription;

    subscription.catch(() => {
      if (this._unsubCloudEvents === subscription) {
        this._unsubCloudEvents = undefined;
      }
    });
  }

  private async _loadInitialStatus() {
    await this._refreshCloudStatus();
    this._loading = false;
  }

  private _refreshCloudStatus = (): Promise<void> => {
    this._statusRead = this._statusRead
      .then(() => this._readCloudStatus())
      .catch(() => undefined);
    return this._statusRead;
  };

  private async _readCloudStatus(): Promise<void> {
    let status: CloudStatus;
    try {
      status = await fetchCloudStatus(this.hass);
    } catch (_err) {
      // Nothing to reconcile against. The registration form is the right place
      // to be, and the next event tries again.
      return;
    }

    // Lit keeps updating an element that was connected once.
    if (!this.isConnected) {
      return;
    }

    const wasLoggedIn = this._wasLoggedIn;
    this._wasLoggedIn = status.logged_in;
    this._autoLogin = cloudStatusAutoLogin(status);

    if (status.logged_in && wasLoggedIn === false) {
      fireEvent(this, "cloud-step", { step: "DONE" });
    }
  }

  private _emailChanged(
    ev: HASSDomEvent<HASSDomEvents["cloud-email-changed"]>
  ) {
    this._email = ev.detail.value;
  }

  private _signIn() {
    fireEvent(this, "cloud-step", { step: "SIGNIN", email: this._email });
  }

  private async _cancelAutoLogin() {
    try {
      await cancelCloudAutoLogin(this.hass);
    } catch (_err) {
      // Fire and forget: the card has already returned to the form, and the
      // read below reconciles a registration the backend refused to drop.
    } finally {
      this._refreshCloudStatus();
    }
  }

  static styles = [
    AssistantSetupStyles,
    css`
      .content {
        width: 100%;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: var(--ha-space-8) 0;
      }
      cloud-register-card {
        text-align: start;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-step-signup": CloudStepSignup;
  }
}
