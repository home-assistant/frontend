import { mdiClose } from "@mdi/js";
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./ha-icon-button";

@customElement("ha-onboarding-banner")
export class HaOnboardingBanner extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  private _fireDismissEvent() {
    fireEvent(this, "banner-closed");
  }

  render() {
    return html`
      <div
        class="onboarding-banner"
        role="region"
        aria-label=${this.hass.localize(
          "ui.components.ha_onboarding_banner.aria_label"
        )}
      >
        <div class="message" aria-live="polite">
          <span
            >${this.hass.localize(
              "ui.components.ha_onboarding_banner.welcome"
            )}</span
          >
          ${this.hass.localize("ui.components.ha_onboarding_banner.start_by")}
          <a href="/config/devices/dashboard">
            ${this.hass.localize(
              "ui.components.ha_onboarding_banner.link_text"
            )}
          </a>
          ${this.hass.localize("ui.components.ha_onboarding_banner.end")}
        </div>
        <ha-icon-button
          .path=${mdiClose}
          .label=${this.hass.localize(
            "ui.components.ha_onboarding_banner.dismiss"
          )}
          @click=${this._fireDismissEvent}
        >
        </ha-icon-button>
      </div>
    `;
  }

  static styles = css`
    .onboarding-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px;
      margin-bottom: 8px;
      background-color: var(--primary-background-color);
      border-bottom: 1px solid var(--divider-color);
      font-size: var(--ha-font-size-m);
    }

    .onboarding-banner span {
      margin-right: 4px;
    }

    .onboarding-banner .message {
      flex: 1;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-onboarding-banner": HaOnboardingBanner;
  }
  interface HASSDomEvents {
    "banner-closed": undefined;
  }
}
