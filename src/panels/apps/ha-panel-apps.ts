import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../layouts/hass-error-screen";
import "../../layouts/hass-loading-screen";
import type { HassioAddonsInfo } from "../../data/hassio/addon";
import { fetchHassioAddonsInfo } from "../../data/hassio/addon";
import type { SupervisorStore } from "../../data/supervisor/store";
import { fetchSupervisorStore } from "../../data/supervisor/store";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import type { HomeAssistant, Route } from "../../types";
import "./apps-store";

@customElement("ha-panel-apps")
class HaPanelApps extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _store?: SupervisorStore;

  @state() private _addon?: HassioAddonsInfo;

  @state() private _error?: string;

  public connectedCallback(): void {
    super.connectedCallback();
    this._loadData();
  }

  protected render() {
    if (this._error) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this._error}
        ></hass-error-screen>
      `;
    }

    if (!this._store || !this._addon) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></hass-loading-screen>
      `;
    }

    return html`
      <apps-store
        .hass=${this.hass}
        .store=${this._store}
        .addon=${this._addon}
        .narrow=${this.narrow}
        .route=${this.route}
      ></apps-store>
    `;
  }

  private async _loadData(): Promise<void> {
    try {
      const [addon, store] = await Promise.all([
        fetchHassioAddonsInfo(this.hass),
        fetchSupervisorStore(this.hass),
      ]);

      this._addon = addon;
      this._store = store;

      this.addEventListener(
        "apps-collection-refresh",
        this._handleCollectionRefresh as unknown as EventListener
      );
    } catch (err: any) {
      this._error = err.message || "Failed to load apps data";
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.apps.error_loading"),
        text: this._error,
      });
    }
  }

  private _handleCollectionRefresh = async (ev: CustomEvent): Promise<void> => {
    const { collection } = ev.detail;
    try {
      if (collection === "addon") {
        this._addon = await fetchHassioAddonsInfo(this.hass);
      } else if (collection === "store") {
        this._store = await fetchSupervisorStore(this.hass);
      }
    } catch (_err: any) {
      // Silently fail on refresh errors
    }
    fireEvent(this, "apps-collection-refresh", { collection });
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
    }
  `;
}

declare global {
  interface HASSDomEvents {
    "apps-collection-refresh": { collection: "addon" | "store" };
  }
  interface HTMLElementTagNameMap {
    "ha-panel-apps": HaPanelApps;
  }
}
