import {
  mdiCogs,
  mdiFileDocument,
  mdiInformationVariant,
  mdiMathLog,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeLocalize } from "../../../common/translations/localize";
import type { HassioAddonDetails } from "../../../data/hassio/addon";
import {
  fetchHassioAddonInfo,
  fetchHassioAddonsInfo,
} from "../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import { fetchSupervisorStore } from "../../../data/supervisor/store";
import type {
  Supervisor,
  SupervisorKeys,
} from "../../../data/supervisor/supervisor";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { getTranslation } from "../../../util/common-translation";

// Import hassio components
import "../../../../hassio/src/addon-view/hassio-addon-router";

@customElement("ha-config-app-dashboard")
class HaConfigAppDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @state() private _addon?: HassioAddonDetails;

  @state() private _error?: string;

  @state() private _supervisor?: Partial<Supervisor>;

  @state() private _controlEnabled = false;

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
    await this._initializeSupervisor();
    await this._loadAddon();
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

    if (!this._addon || !this._supervisor) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }

    const addonTabs: PageNavigation[] = [
      {
        translationKey: "addon.panel.info",
        path: `/config/app/${this._addon.slug}/info`,
        iconPath: mdiInformationVariant,
      },
    ];

    if (this._addon.documentation) {
      addonTabs.push({
        translationKey: "addon.panel.documentation",
        path: `/config/app/${this._addon.slug}/documentation`,
        iconPath: mdiFileDocument,
      });
    }

    if (this._addon.version) {
      addonTabs.push(
        {
          translationKey: "addon.panel.configuration",
          path: `/config/app/${this._addon.slug}/config`,
          iconPath: mdiCogs,
        },
        {
          translationKey: "addon.panel.log",
          path: `/config/app/${this._addon.slug}/logs`,
          iconPath: mdiMathLog,
        }
      );
    }

    const route = this._computeTail(this.route);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .localizeFunc=${this._supervisor.localize}
        .narrow=${this.narrow}
        .route=${route}
        .tabs=${addonTabs}
        back-path="/config/apps"
        supervisor
      >
        <span slot="header">${this._addon.name}</span>
        <hassio-addon-router
          .route=${route}
          .narrow=${this.narrow}
          .hass=${this.hass}
          .supervisor=${this._supervisor}
          .addon=${this._addon}
          .controlEnabled=${this._controlEnabled}
          @system-managed-take-control=${this._enableControl}
        ></hassio-addon-router>
      </hass-tabs-subpage>
    `;
  }

  private async _initializeSupervisor(): Promise<void> {
    try {
      const { language, data } = await getTranslation(null, this.hass.language);

      const localize = await computeLocalize<SupervisorKeys>(
        this.constructor.prototype,
        language,
        {
          [language]: data,
        }
      );

      const [addon, store] = await Promise.all([
        fetchHassioAddonsInfo(this.hass),
        fetchSupervisorStore(this.hass),
      ]);

      this._supervisor = {
        localize,
        addon,
        store,
      };
    } catch (err: any) {
      this._error = `Failed to load supervisor data: ${extractApiErrorMessage(err)}`;
    }
  }

  private async _loadAddon(): Promise<void> {
    const slug = this.route.path.split("/")[1];
    if (!slug) {
      this._error = "No addon specified";
      return;
    }

    try {
      this._addon = await fetchHassioAddonInfo(this.hass, slug);
    } catch (err: any) {
      this._error = `Error loading addon: ${extractApiErrorMessage(err)}`;
    }
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
      // Reload addon info
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
          padding: 24px 0 32px;
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
