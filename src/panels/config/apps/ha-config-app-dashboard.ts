import {
  mdiCogs,
  mdiFileDocument,
  mdiInformationVariant,
  mdiTextBoxOutline,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { extractSearchParam } from "../../../common/url/search-params";
import type { HassioAddonDetails } from "../../../data/hassio/addon";
import { fetchHassioAddonInfo } from "../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  addStoreRepository,
  fetchSupervisorStore,
} from "../../../data/supervisor/store";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";

// Import app-view components
import "./app-view/supervisor-app-router";

@customElement("ha-config-app-dashboard")
class HaConfigAppDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @state() private _addon?: HassioAddonDetails;

  @state() private _error?: string;

  @state() private _controlEnabled = false;

  @state() private _fromStore = false;

  private _computeTail = memoizeOne((route: Route) => {
    const pathParts = route.path.split("/").filter(Boolean);
    // Path is like /<slug>/info or /<slug>/config
    const slug = pathParts[0] || "";
    const subPath = pathParts.slice(1).join("/");

    return {
      prefix: route.prefix + "/" + slug,
      path: subPath ? "/" + subPath : "",
    };
  });

  protected async firstUpdated(): Promise<void> {
    this._fromStore = extractSearchParam("store") === "true";
    const repositoryUrl = extractSearchParam("repository_url");
    await this._loadAddon(repositoryUrl);
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
  }

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("route") && this.route) {
      const oldRoute = changedProperties.get("route") as Route | undefined;
      const oldSlug = oldRoute?.path.split("/")[1];
      const newSlug = this.route.path.split("/")[1];

      if (oldSlug !== newSlug && newSlug) {
        this._loadAddon();
      }
    }
  }

  protected render(): TemplateResult {
    if (this._error) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .error=${this._error}
      ></hass-error-screen>`;
    }

    if (!this._addon) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }

    const addonTabs: PageNavigation[] = [
      {
        translationKey: "ui.panel.config.apps.panel.info",
        path: `/config/app/${this._addon.slug}/info`,
        iconPath: mdiInformationVariant,
      },
    ];

    if (this._addon.documentation) {
      addonTabs.push({
        translationKey: "ui.panel.config.apps.panel.documentation",
        path: `/config/app/${this._addon.slug}/documentation`,
        iconPath: mdiFileDocument,
      });
    }

    if (this._addon.version) {
      addonTabs.push(
        {
          translationKey: "ui.panel.config.apps.panel.configuration",
          path: `/config/app/${this._addon.slug}/config`,
          iconPath: mdiCogs,
        },
        {
          translationKey: "ui.panel.config.apps.panel.log",
          path: `/config/app/${this._addon.slug}/logs`,
          iconPath: mdiTextBoxOutline,
        }
      );
    }

    const route = this._computeTail(this.route);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${route}
        .tabs=${addonTabs}
        back-path=${this._fromStore ? "/config/apps/available" : "/config/apps"}
      >
        <span slot="header">${this._addon.name}</span>
        <supervisor-app-router
          .route=${route}
          .narrow=${this.narrow}
          .hass=${this.hass}
          .addon=${this._addon}
          .controlEnabled=${this._controlEnabled}
          @system-managed-take-control=${this._enableControl}
        ></supervisor-app-router>
      </hass-tabs-subpage>
    `;
  }

  private async _loadAddon(repositoryUrl?: string | null): Promise<void> {
    const slug = this.route.path.split("/")[1];
    if (!slug) {
      this._error = "No addon specified";
      return;
    }

    try {
      this._addon = await fetchHassioAddonInfo(this.hass, slug);
    } catch (err: any) {
      if (repositoryUrl) {
        try {
          await this._handleMissingRepository(slug, repositoryUrl);
          if (this._addon) {
            // Clear error if we successfully added the repository and loaded the addon
            this._error = undefined;
            return;
          }
        } catch (addRepoErr: any) {
          this._error = extractApiErrorMessage(addRepoErr);
          return;
        }
      }
      this._error = `Error loading app: ${extractApiErrorMessage(err)}`;
    }
  }

  private async _handleMissingRepository(
    slug: string,
    repositoryUrl: string
  ): Promise<void> {
    const storeInfo = await fetchSupervisorStore(this.hass);
    if (storeInfo.repositories.some((repo) => repo.source === repositoryUrl)) {
      // Repository is already installed, addon just doesn't exist
      return;
    }

    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.apps.my.add_repository_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.apps.my.add_repository_description",
          { repository: repositoryUrl }
        ),
        confirmText: this.hass.localize("ui.common.add"),
        dismissText: this.hass.localize("ui.common.cancel"),
      }))
    ) {
      this._error = this.hass.localize(
        "ui.panel.config.apps.my.error_repository_not_found"
      );
      return;
    }

    await addStoreRepository(this.hass, repositoryUrl);
    this._addon = await fetchHassioAddonInfo(this.hass, slug);
  }

  private async _apiCalled(ev): Promise<void> {
    if (!ev.detail.success) {
      return;
    }

    const pathSplit: string[] = ev.detail.path?.split("/");

    if (!pathSplit || pathSplit.length === 0) {
      return;
    }

    const path: string = pathSplit[pathSplit.length - 1];

    if (["uninstall", "install", "update", "start", "stop"].includes(path)) {
      fireEvent(this, "apps-collection-refresh", {
        collection: "addon",
      });
    }

    if (path === "uninstall") {
      // Navigate back to installed apps after uninstall
      window.history.back();
    } else {
      // Reload app info
      await this._loadAddon();
    }
  }

  private _enableControl() {
    this._controlEnabled = true;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          color: var(--primary-text-color);
        }
        .content {
          padding: var(--ha-space-6) 0 var(--ha-space-8);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-app-dashboard": HaConfigAppDashboard;
  }
}
