import {
  mdiArrowUpBoldCircle,
  mdiPuzzle,
  mdiRefresh,
  mdiStorePlus,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/search-input";
import type {
  HassioAddonInfo,
  HassioAddonsInfo,
} from "../../../data/hassio/addon";
import {
  fetchHassioAddonsInfo,
  reloadHassioAddons,
} from "../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import "./components/supervisor-apps-card-content";

@customElement("ha-config-apps-installed")
export class HaConfigAppsInstalled extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _addonInfo?: HassioAddonsInfo;

  @state() private _filter?: string;

  @state() private _error?: string;

  protected firstUpdated() {
    this._loadData();
  }

  protected render(): TemplateResult {
    if (this._error) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this._error}
        ></hass-error-screen>
      `;
    }

    if (!this._addonInfo) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></hass-loading-screen>
      `;
    }

    const addons = this._getAddons(this._addonInfo.addons, this._filter);

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        .header=${this.hass.localize("ui.panel.config.apps.caption")}
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._handleCheckUpdates}
          .path=${mdiRefresh}
          .label=${this.hass.localize(
            "ui.panel.config.apps.store.check_updates"
          )}
        ></ha-icon-button>
        <div class="search">
          <search-input
            .hass=${this.hass}
            suffix
            .filter=${this._filter}
            @value-changed=${this._handleSearchChange}
            .label=${this.hass.localize(
              "ui.panel.config.apps.installed.search"
            )}
          >
          </search-input>
        </div>
        <div class="content">
          <div class="card-group">
            ${addons.length === 0
              ? html`
                  <ha-card outlined>
                    <div class="card-content">
                      <button class="link" @click=${this._openStore}>
                        ${this.hass.localize(
                          "ui.panel.config.apps.installed.no_apps"
                        )}
                      </button>
                    </div>
                  </ha-card>
                `
              : addons.map(
                  (addon) => html`
                    <ha-card
                      outlined
                      .addon=${addon}
                      @click=${this._addonTapped}
                    >
                      <div class="card-content">
                        <supervisor-apps-card-content
                          .hass=${this.hass}
                          .title=${addon.name}
                          .description=${addon.description}
                          available
                          .showTopbar=${addon.update_available}
                          topbarClass="update"
                          .icon=${addon.update_available
                            ? mdiArrowUpBoldCircle
                            : mdiPuzzle}
                          .iconTitle=${addon.state !== "started"
                            ? this.hass.localize(
                                "ui.panel.config.apps.installed.app_stopped"
                              )
                            : addon.update_available
                              ? this.hass.localize(
                                  "ui.panel.config.apps.installed.app_update_available"
                                )
                              : this.hass.localize(
                                  "ui.panel.config.apps.installed.app_running"
                                )}
                          .iconClass=${addon.update_available
                            ? addon.state === "started"
                              ? "update"
                              : "update stopped"
                            : addon.state === "started"
                              ? "running"
                              : "stopped"}
                          .iconImage=${addon.icon
                            ? `/api/hassio/addons/${addon.slug}/icon`
                            : undefined}
                        ></supervisor-apps-card-content>
                      </div>
                    </ha-card>
                  `
                )}
          </div>
        </div>

        <a href="/config/apps/available">
          <ha-fab
            .label=${this.hass.localize(
              "ui.panel.config.apps.installed.add_app"
            )}
            extended
          >
            <ha-svg-icon slot="icon" .path=${mdiStorePlus}></ha-svg-icon>
          </ha-fab>
        </a>
      </hass-subpage>
    `;
  }

  private _getAddons = memoizeOne(
    (addons: HassioAddonInfo[], filter?: string) => {
      let filteredAddons = addons;
      if (filter) {
        const lowerCaseFilter = filter.toLowerCase();
        filteredAddons = addons.filter(
          (addon) =>
            addon.name.toLowerCase().includes(lowerCaseFilter) ||
            addon.description.toLowerCase().includes(lowerCaseFilter) ||
            addon.slug.toLowerCase().includes(lowerCaseFilter)
        );
      }
      return filteredAddons.sort((a, b) =>
        caseInsensitiveStringCompare(a.name, b.name, this.hass.locale.language)
      );
    }
  );

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private async _loadData(): Promise<void> {
    try {
      this._addonInfo = await fetchHassioAddonsInfo(this.hass);
    } catch (err: any) {
      this._error =
        err.message || this.hass.localize("ui.panel.config.apps.error_loading");
    }
  }

  private async _handleCheckUpdates() {
    try {
      await reloadHassioAddons(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
    } finally {
      this._loadData();
    }
  }

  private _addonTapped(ev: Event): void {
    const addon = (ev.currentTarget as any).addon as HassioAddonInfo;
    navigate(`/config/app/${addon.slug}/info`);
  }

  private _openStore(): void {
    navigate("/config/apps/available");
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
    }

    ha-card {
      cursor: pointer;
      overflow: hidden;
      direction: ltr;
    }

    .search {
      position: sticky;
      top: 0;
      z-index: 2;
    }

    search-input {
      display: block;
      --mdc-text-field-fill-color: var(--sidebar-background-color);
      --mdc-text-field-idle-line-color: var(--divider-color);
    }

    .content {
      padding: var(--ha-space-4);
      margin-bottom: var(--ha-space-18);
    }

    .card-group {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      grid-gap: var(--ha-space-2);
    }

    .card-content {
      display: flex;
      justify-content: space-between;
      padding: var(--ha-space-4);
    }

    button.link {
      color: var(--primary-color);
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      text-align: left;
      text-decoration: underline;
      cursor: pointer;
    }

    ha-fab {
      position: fixed;
      right: calc(var(--ha-space-4) + var(--safe-area-inset-right));
      bottom: calc(var(--ha-space-4) + var(--safe-area-inset-bottom));
      inset-inline-end: calc(var(--ha-space-4) + var(--safe-area-inset-right));
      inset-inline-start: initial;
      z-index: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-apps-installed": HaConfigAppsInstalled;
  }
}
