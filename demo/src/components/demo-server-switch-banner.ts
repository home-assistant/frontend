import { mdiMapMarkerRadius } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../src/components/ha-button";
import "../../../src/components/ha-svg-icon";
import type { HomeAssistant } from "../../../src/types";

// Mock of a companion app flow: the app sees that the device location is
// inside the home zone of another configured server and offers to switch.
// The other server is simulated by loading another demo configuration.
const DETECTED_SERVER_NAME = "Beach house";
const DETECTED_SERVER_DEMO = "home";
const SHOW_DELAY_MS = 2000;

@customElement("demo-server-switch-banner")
export class DemoServerSwitchBanner extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _switching = false;

  private _showTimer?: ReturnType<typeof setTimeout>;

  public connectedCallback() {
    super.connectedCallback();
    if (new URLSearchParams(window.location.search).has("demo")) {
      // Already switched, so the device is at the current server.
      return;
    }
    this._showTimer = setTimeout(() => {
      this._open = true;
    }, SHOW_DELAY_MS);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._showTimer);
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    return html`
      <div class="banner ${this._open ? "open" : ""}" role="status">
        <div class="content">
          <div class="icon">
            <ha-svg-icon .path=${mdiMapMarkerRadius}></ha-svg-icon>
          </div>
          <div class="text">
            <span class="title">
              ${this.hass.localize("ui.panel.page-demo.server_switch.title", {
                server: DETECTED_SERVER_NAME,
              })}
            </span>
            <span class="description">
              ${this.hass.localize(
                "ui.panel.page-demo.server_switch.description",
                { server: DETECTED_SERVER_NAME }
              )}
            </span>
          </div>
        </div>
        <div class="actions">
          <ha-button
            appearance="plain"
            .disabled=${this._switching}
            @click=${this._dismiss}
          >
            ${this.hass.localize("ui.panel.page-demo.server_switch.dismiss")}
          </ha-button>
          <ha-button .loading=${this._switching} @click=${this._switch}>
            ${this.hass.localize("ui.panel.page-demo.server_switch.switch")}
          </ha-button>
        </div>
      </div>
    `;
  }

  private _dismiss() {
    this._open = false;
  }

  private _switch() {
    this._switching = true;
    // A server switch reloads the app with the other server.
    setTimeout(() => {
      window.location.assign(`?demo=${DETECTED_SERVER_DEMO}`);
    }, 800);
  }

  static styles = css`
    .banner {
      position: fixed;
      z-index: 10;
      inset-inline: var(--ha-space-3);
      inset-block-end: calc(
        var(--safe-area-inset-bottom, 0px) + var(--ha-space-3)
      );
      max-width: 560px;
      margin-inline: auto;
      box-sizing: border-box;
      padding: var(--ha-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
      background-color: var(--card-background-color);
      color: var(--primary-text-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-2xl);
      box-shadow: var(--ha-box-shadow-l);
      transform: translateY(calc(100% + var(--ha-space-6)));
      opacity: 0;
      pointer-events: none;
      transition:
        transform 400ms cubic-bezier(0.2, 0, 0, 1),
        opacity 250ms ease;
    }
    .banner.open {
      transform: none;
      opacity: 1;
      pointer-events: auto;
    }
    .content {
      display: flex;
      align-items: flex-start;
      gap: var(--ha-space-3);
    }
    .icon {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--ha-border-radius-circle);
      color: var(--primary-color);
      background-color: rgb(from var(--primary-color) r g b / 0.15);
    }
    .text {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
    }
    .title {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
    }
    .description {
      font-size: var(--ha-font-size-m);
      line-height: var(--ha-line-height-normal);
      color: var(--secondary-text-color);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-server-switch-banner": DemoServerSwitchBanner;
  }
}
