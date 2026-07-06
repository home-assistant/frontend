import { mdiClose, mdiFlaskOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import { mainWindow } from "../../../src/common/dom/get_main_window";
import { navigate } from "../../../src/common/navigate";
import "../../../src/components/ha-button";
import "../../../src/components/ha-card";
import "../../../src/components/ha-icon-button";
import "../../../src/components/ha-svg-icon";
import "../../../src/components/ha-switch";
import type { HaSwitch } from "../../../src/components/ha-switch";
import type { CloudDemoScenario } from "../stubs/cloud-demo-state";
import {
  getCloudDemoScenario,
  setCloudDemoScenario,
  subscribeCloudDemoScenario,
} from "../stubs/cloud-demo-state";

// Walk the DOM, descending into shadow roots, to find the first matching
// element. Used to reach <ha-panel-config> (which owns the cloud status) so we
// can ask it to re-fetch after a scenario change.
const deepQuery = (
  selector: string,
  root: Document | ShadowRoot = document
): Element | null => {
  const direct = root.querySelector(selector);
  if (direct) {
    return direct;
  }
  const elements = root.querySelectorAll("*");
  for (const element of elements) {
    const shadow = element.shadowRoot;
    if (shadow) {
      const found = deepQuery(selector, shadow);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

/**
 * Demo-only floating panel that flips the mocked Home Assistant Cloud state so
 * reviewers can preview every UI state of the cloud account page. It writes to
 * the shared {@link CloudDemoScenario} (which the cloud/backup mocks read) and
 * then nudges the page to re-read it. Lives entirely under demo/.
 */
@customElement("cloud-demo-controls")
export class CloudDemoControls extends LitElement {
  @state() private _open = true;

  @state() private _visible = false;

  @state() private _scenario: CloudDemoScenario = getCloudDemoScenario();

  private _unsub?: () => void;

  // The demo uses hash-based routing (navigate() sets location.hash), so the
  // active route lives in the hash, not the pathname.
  private get _currentPath(): string {
    const hash = mainWindow.location.hash;
    return hash.startsWith("#/") ? hash.slice(1) : mainWindow.location.pathname;
  }

  private _locationChanged = () => {
    this._visible = this._currentPath.startsWith("/config/cloud");
  };

  public connectedCallback(): void {
    super.connectedCallback();
    this._locationChanged();
    mainWindow.addEventListener("location-changed", this._locationChanged);
    mainWindow.addEventListener("popstate", this._locationChanged);
    mainWindow.addEventListener("hashchange", this._locationChanged);
    this._unsub = subscribeCloudDemoScenario((scenario) => {
      this._scenario = { ...scenario };
    });
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    mainWindow.removeEventListener("location-changed", this._locationChanged);
    mainWindow.removeEventListener("popstate", this._locationChanged);
    mainWindow.removeEventListener("hashchange", this._locationChanged);
    this._unsub?.();
  }

  protected render() {
    if (!this._visible) {
      return nothing;
    }
    if (!this._open) {
      return html`
        <ha-icon-button
          class="fab"
          label="Cloud demo controls"
          .path=${mdiFlaskOutline}
          @click=${this._toggleOpen}
        ></ha-icon-button>
      `;
    }
    return html`
      <ha-card>
        <div class="header">
          <ha-svg-icon .path=${mdiFlaskOutline}></ha-svg-icon>
          <span class="title">Cloud demo controls</span>
          <ha-icon-button
            label="Close"
            .path=${mdiClose}
            @click=${this._toggleOpen}
          ></ha-icon-button>
        </div>
        <p class="note">
          Demo only. Flips the mocked cloud state shown on this page.
        </p>
        <div class="controls">
          ${this._segment("Subscription", "account", [
            ["active", "Active"],
            ["trialing", "Trialing"],
            ["canceled", "Canceled"],
            ["expired", "Expired"],
            ["unknown", "Unknown"],
          ])}
          ${this._toggle("Onboarded", "onboarded")}
          ${this._toggle("Onboarding postponed", "postponed")}
          ${this._toggle("Remote access", "remote")}
          ${this._segment("Remote status", "remoteStatus", [
            ["ready", "Ready"],
            ["generating", "Preparing"],
            ["loading", "Loading"],
            ["loaded", "Loaded"],
            ["error", "Error"],
          ])}
          ${this._segment("Backups", "backup", [
            ["fresh", "Recent"],
            ["stale", "Old"],
            ["failed", "Failed"],
            ["local", "Local only"],
            ["none", "None"],
          ])}
          ${this._toggle("Alexa linked", "alexa")}
          ${this._toggle("Google linked", "google")}
          ${this._toggle("Cameras (WebRTC)", "webrtc")}
          ${this._toggle("Has webhooks", "webhooks")}
        </div>
      </ha-card>
    `;
  }

  private _segment(
    label: string,
    field: keyof CloudDemoScenario,
    options: [string, string][]
  ) {
    return html`
      <div class="row">
        <span>${label}</span>
        <div class="segment">
          ${options.map(
            ([value, text]) => html`
              <ha-button
                size="s"
                appearance=${this._scenario[field] === value
                  ? "filled"
                  : "plain"}
                data-field=${field}
                data-value=${value}
                @click=${this._segmentClick}
              >
                ${text}
              </ha-button>
            `
          )}
        </div>
      </div>
    `;
  }

  private _toggle(label: string, field: keyof CloudDemoScenario) {
    return html`
      <div class="row">
        <span>${label}</span>
        <ha-switch
          .checked=${this._scenario[field] as boolean}
          data-field=${field}
          @change=${this._toggleChange}
        ></ha-switch>
      </div>
    `;
  }

  private _toggleOpen() {
    this._open = !this._open;
  }

  private _segmentClick(ev: Event) {
    const target = ev.currentTarget as HTMLElement;
    this._set(
      target.dataset.field as keyof CloudDemoScenario,
      target.dataset.value!
    );
  }

  private _toggleChange(ev: Event) {
    const target = ev.target as HaSwitch;
    this._set(target.dataset.field as keyof CloudDemoScenario, target.checked);
  }

  private _set(field: keyof CloudDemoScenario, value: string | boolean) {
    setCloudDemoScenario({ [field]: value } as Partial<CloudDemoScenario>);
    this._refresh();
  }

  private _refresh() {
    // Refresh the shared cloud status so login-state changes (signed out) and
    // status-derived fields update.
    const panel = deepQuery("ha-panel-config");
    if (panel) {
      fireEvent(panel as HTMLElement, "ha-refresh-cloud-status");
    }
    // cloud-account fetches its subscription/backup/webhook data once on mount
    // and is not cached by the router, so bounce through a sibling cloud route
    // to force a clean remount that re-reads the updated mocks.
    const path = this._currentPath;
    if (path.startsWith("/config/cloud") && path !== "/config/cloud/login") {
      const sibling =
        path === "/config/cloud/remote"
          ? "/config/cloud/account"
          : "/config/cloud/remote";
      navigate(sibling, { replace: true });
      window.setTimeout(() => navigate(path, { replace: true }), 0);
    }
  }

  static styles = css`
    :host {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 9999;
    }
    .fab {
      --mdc-icon-button-size: 48px;
      --mdc-icon-size: 24px;
      background-color: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }
    ha-card {
      display: block;
      width: 320px;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 16px;
      border-bottom: 1px solid var(--divider-color);
    }
    .header .title {
      flex: 1;
      font-weight: var(--ha-font-weight-medium, 500);
    }
    .header ha-svg-icon {
      color: var(--secondary-text-color);
    }
    .note {
      margin: 8px 16px;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s, 0.875rem);
    }
    .controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 16px 16px;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 36px;
    }
    .segment {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-demo-controls": CloudDemoControls;
  }
}
