import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../types";
import { navigate } from "../common/navigate";
import "./ha-icon";
import "./ha-icon-button";

@customElement("ha-onboarding-banner")
export class HaOnboardingBanner extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dismissed = false;

  private _navigate(ev: Event) {
    ev.preventDefault();
    if (this.hass && this.hass.connected) {
      navigate("/config/devices/dashboard");
    }
  }

  private _dismiss() {
    this._dismissed = true;
  }

  render() {
    const devices = this.hass.devices ? Object.values(this.hass.devices) : [];
    const physicalDevices = devices.filter(
      (device) =>
        device.entry_type !== "service" && device.connections.length > 0
    );
    const hasPhysicalDevices = physicalDevices.length > 0;

    if (
      !this.hass.connected ||
      !this.hass.config ||
      hasPhysicalDevices ||
      this._dismissed
    ) {
      return nothing;
    }

    return html`
      <div class="onboarding-banner" role="region" aria-label="Getting started">
        <div class="message">
          <strong>Welcome!</strong>&nbsp;Start by&nbsp;
          <a href="#/config/devices/dashboard" @click=${this._navigate}>
            adding your first device
          </a>
          &nbsp;to get going.
        </div>
        <ha-icon-button
          class="close-btn"
          title="Dismiss"
          @click=${this._dismiss}
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  static styles = css`
    .onboarding-banner {
      position: relative;
      padding: 16px 40px;
      background-color: var(--primary-background-color);
      border-bottom: 1px solid var(--divider-color);
      font-size: 1rem;
      margin-bottom: 16px;
      text-align: center;
    }

    .onboarding-banner a {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 600;
    }

    .onboarding-banner a:hover {
      text-decoration: underline;
    }

    .onboarding-banner .close-btn {
      position: absolute;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
    }

    .onboarding-banner .close-btn ha-icon {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-onboarding-banner": HaOnboardingBanner;
  }
}
