import { sanitizeUrl } from "@braintree/sanitize-url";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import {
  protocolIntegrationPicked,
  PROTOCOL_INTEGRATIONS,
} from "../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../common/navigate";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../common/url/search-params";
import { domainToName } from "../../data/integration";
import "../../layouts/hass-error-screen";
import type { HomeAssistant, Route } from "../../types";
import { documentationUrl } from "../../util/documentation-url";

// When a user presses "m", the user is redirected to the first redirect
// for which holds true currentPath.startsWith(redirect.redirect)
// That's why redirects should be sorted with more specific ones first
// Or else pressing "M" will link to the higher level page.

export const getMyRedirects = (): Redirects => ({
  application_credentials: {
    redirect: "/config/application_credentials",
  },
  developer_assist: {
    redirect: "/developer-tools/assist",
  },
  developer_states: {
    redirect: "/developer-tools/state",
  },
  developer_services: {
    redirect: "/developer-tools/action",
  },
  developer_call_service: {
    redirect: "/developer-tools/action",
    params: {
      service: "string",
    },
  },
  developer_template: {
    redirect: "/developer-tools/template",
  },
  developer_events: {
    redirect: "/developer-tools/event",
  },
  developer_statistics: {
    redirect: "/developer-tools/statistics",
  },
  server_controls: {
    redirect: "/developer-tools/yaml",
  },
  calendar: {
    component: "calendar",
    redirect: "/calendar",
  },
  companion_app: {
    redirect: "#external-app-configuration",
  },
  config: {
    redirect: "/config/dashboard",
  },
  cloud: {
    component: "cloud",
    redirect: "/config/cloud",
  },
  config_flow_start: {
    redirect: "/config/integrations/dashboard/add",
    params: {
      domain: "string",
    },
  },
  brand: {
    redirect: "/config/integrations/dashboard/add",
    params: {
      brand: "string",
    },
  },
  integration: {
    redirect: "/config/integrations/integration",
    params: {
      domain: "string",
    },
  },
  integrations: {
    redirect: "/config/integrations",
  },
  config_mqtt: {
    component: "mqtt",
    redirect: "/config/mqtt",
  },
  config_zha: {
    component: "zha",
    redirect: "/config/zha/dashboard",
  },
  config_zwave_js: {
    component: "zwave_js",
    redirect: "/config/zwave_js/dashboard",
  },
  add_zigbee_device: {
    component: "zha",
    redirect: "/config/zha/add",
  },
  add_zwave_device: {
    component: "zwave_js",
    redirect: "/config/zwave_js/add",
  },
  add_matter_device: {
    component: "matter",
    redirect: "/config/matter/add",
  },
  bluetooth_advertisement_monitor: {
    component: "bluetooth",
    redirect: "/config/bluetooth/advertisement-monitor",
  },
  bluetooth_connection_monitor: {
    component: "bluetooth",
    redirect: "/config/bluetooth/connection-monitor",
  },
  bluetooth_visualization: {
    component: "bluetooth",
    redirect: "/config/bluetooth/visualization",
  },
  config_bluetooth: {
    component: "bluetooth",
    redirect: "/config/bluetooth",
  },
  config_dhcp: {
    component: "dhcp",
    redirect: "/config/dhcp",
  },
  config_energy: {
    component: "energy",
    redirect: "/config/energy/dashboard",
  },
  config_ssdp: {
    component: "ssdp",
    redirect: "/config/ssdp",
  },
  config_zeroconf: {
    component: "zeroconf",
    redirect: "/config/zeroconf",
  },
  devices: {
    redirect: "/config/devices/dashboard",
  },
  entities: {
    redirect: "/config/entities",
  },
  labels: {
    redirect: "/config/labels",
  },
  energy: {
    component: "energy",
    redirect: "/energy",
  },
  areas: {
    redirect: "/config/areas/dashboard",
  },
  blueprint_import: {
    component: "blueprint",
    redirect: "/config/blueprint/dashboard/import",
    params: {
      blueprint_url: "url",
    },
  },
  blueprints: {
    component: "blueprint",
    redirect: "/config/blueprint/dashboard",
  },
  automations: {
    component: "automation",
    redirect: "/config/automation/dashboard",
  },
  scenes: {
    component: "scene",
    redirect: "/config/scene/dashboard",
  },
  scripts: {
    component: "script",
    redirect: "/config/script/dashboard",
  },
  helpers: {
    redirect: "/config/helpers",
  },
  tags: {
    component: "tag",
    redirect: "/config/tags",
  },
  voice_assistants: {
    redirect: "/config/voice-assistants",
  },
  lovelace_dashboards: {
    component: "lovelace",
    redirect: "/config/lovelace/dashboards",
  },
  lovelace_resources: {
    component: "lovelace",
    redirect: "/config/lovelace/resources",
  },
  oauth: {
    redirect: "/auth/external/callback",
    navigate_outside_spa: true,
    params: {
      error: "string?",
      code: "string?",
      state: "string",
    },
  },
  people: {
    component: "person",
    redirect: "/config/person",
  },
  zones: {
    component: "zone",
    redirect: "/config/zone",
  },
  users: {
    redirect: "/config/users",
  },
  general: {
    redirect: "/config/general",
  },
  logs: {
    redirect: "/config/logs",
    params: {
      provider: "string?",
    },
  },
  repairs: {
    component: "repairs",
    redirect: "/config/repairs",
  },
  info: {
    redirect: "/config/info",
  },
  system_health: {
    redirect: "/config/repairs?dialog=system-health",
  },
  hardware: {
    redirect: "/config/hardware",
  },
  storage: {
    redirect: "/config/storage",
  },
  network: {
    redirect: "/config/network",
  },
  analytics: {
    redirect: "/config/analytics",
  },
  updates: {
    redirect: "/config/updates",
  },
  system_dashboard: {
    redirect: "/config/system",
  },
  customize: {
    // customize was removed in 2021.12, fallback to dashboard
    redirect: "/config/dashboard",
  },
  profile_security: {
    redirect: "/profile/security",
  },
  profile: {
    redirect: "/profile",
  },
  logbook: {
    component: "logbook",
    redirect: "/logbook",
  },
  history: {
    component: "history",
    redirect: "/history",
  },
  media_browser: {
    component: "media_source",
    redirect: "/media-browser",
  },
  backup_list: {
    component: "backup",
    redirect: "/config/backup/backups",
  },
  backup_config: {
    component: "backup",
    redirect: "/config/backup/settings",
  },
  backup: {
    component: "backup",
    redirect: "/config/backup",
  },
  supervisor_snapshots: {
    component: "backup",
    redirect: "/config/backup",
  },
  supervisor_backups: {
    component: "backup",
    redirect: "/config/backup",
  },
  supervisor_system: {
    // Moved from Supervisor panel in 2022.5
    redirect: "/config/system",
  },
  supervisor_logs: {
    // Moved from Supervisor panel in 2022.5
    redirect: "/config/logs?provider=supervisor",
  },
  supervisor_info: {
    // Moved from Supervisor panel in 2022.5
    redirect: "/config/info",
  },
  hacs_repository: {
    component: "hacs",
    redirect: "/hacs/_my_redirect/hacs_repository",
    params: {
      owner: "string",
      repository: "string",
      category: "string?",
    },
  },
});

const getRedirect = (path: string): Redirect | undefined =>
  getMyRedirects()?.[path];

export type ParamType = "url" | "string" | "string?";

export type Redirects = Record<string, Redirect>;
export interface Redirect {
  redirect: string;
  // Set to True to use browser redirect instead of frontend navigation
  navigate_outside_spa?: boolean;
  component?: string;
  params?: Record<string, ParamType>;
  optional_params?: Record<string, ParamType>;
}

@customElement("ha-panel-my")
class HaPanelMy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @state() public _error?: string;

  private _redirect?: Redirect;

  connectedCallback() {
    super.connectedCallback();
    const path = this.route.path.substring(
      1,
      this.route.path.endsWith("/") ? this.route.path.length - 1 : undefined
    );
    const hasSupervisor = isComponentLoaded(this.hass, "hassio");

    this._redirect = getRedirect(path);

    if (path.startsWith("supervisor") && this._redirect === undefined) {
      if (!hasSupervisor) {
        this._error = "no_supervisor";
        return;
      }
      navigate(`/hassio/_my_redirect/${path}${window.location.search}`, {
        replace: true,
      });
      return;
    }

    if (!this._redirect) {
      this._error = "not_supported";
      return;
    }

    if (this._redirect.redirect === "#external-app-configuration") {
      if (this.hass.auth.external?.config.hasSettingsScreen) {
        this.hass.auth.external!.fireMessage({ type: "config_screen/show" });
        return;
      }
      this._error = "not_app";
      return;
    }

    if (
      this._redirect.component &&
      !isComponentLoaded(this.hass, this._redirect.component)
    ) {
      this.hass.loadBackendTranslation("title", this._redirect.component);
      this._error = "no_component";
      const component = this._redirect.component;
      if ((PROTOCOL_INTEGRATIONS as readonly string[]).includes(component)) {
        const params = extractSearchParamsObject();
        this.hass
          .loadFragmentTranslation("config")
          .then()
          .then(() => {
            protocolIntegrationPicked(this, this.hass, component, {
              domain: params.domain,
              brand: params.brand,
            });
          });
      }
      return;
    }

    let url: string;
    try {
      url = this._createRedirectUrl();
    } catch (_err: any) {
      this._error = "url_error";
      return;
    }

    if (this._redirect.navigate_outside_spa) {
      location.assign(url);
    } else {
      navigate(url, { replace: true });
    }
  }

  protected render() {
    if (this._error) {
      let error: string;
      switch (this._error) {
        case "not_supported":
          error =
            this.hass.localize("ui.panel.my.not_supported", {
              link: html`<a
                target="_blank"
                rel="noreferrer noopener"
                href="https://my.home-assistant.io/faq.html#supported-pages"
                >${this.hass.localize("ui.panel.my.faq_link")}</a
              >`,
            }) || "This redirect is not supported.";
          break;
        case "no_component":
          error =
            this.hass.localize("ui.panel.my.component_not_loaded", {
              integration: html`<a
                target="_blank"
                rel="noreferrer noopener"
                href=${documentationUrl(
                  this.hass,
                  `/integrations/${this._redirect!.component!}`
                )}
                >${domainToName(
                  this.hass.localize,
                  this._redirect!.component!
                )}</a
              >`,
            }) || "This redirect is not supported.";
          break;
        case "no_supervisor":
          error = this.hass.localize("ui.panel.my.no_supervisor", {
            docs_link: html`<a
              target="_blank"
              rel="noreferrer noopener"
              href=${documentationUrl(this.hass, "/installation")}
              >${this.hass.localize("ui.panel.my.documentation")}</a
            >`,
          });
          break;
        case "not_app":
          error = this.hass.localize("ui.panel.my.not_app", {
            link: html`<a
              target="_blank"
              rel="noreferrer noopener"
              href="https://companion.home-assistant.io/download"
              >${this.hass.localize("ui.panel.my.download_app")}</a
            >`,
          });
          break;
        case "url_error":
          error = this.hass.localize("ui.panel.my.url_error");
          break;
        default:
          error = this.hass.localize("ui.panel.my.error") || "Unknown error";
      }
      return html`<hass-error-screen
        .error=${error}
        .hass=${this.hass}
      ></hass-error-screen>`;
    }
    return nothing;
  }

  private _createRedirectUrl(): string {
    const params = this._createRedirectParams();
    return `${this._redirect!.redirect}${params}`;
  }

  private _createRedirectParams(): string {
    const params = extractSearchParamsObject();
    if (!this._redirect!.params && !Object.keys(params).length) {
      return "";
    }
    const resultParams = {};
    for (const [key, type] of Object.entries(this._redirect!.params || {})) {
      if (!params[key] && type.endsWith("?")) {
        continue;
      }
      if (!params[key] || !this._checkParamType(type, params[key])) {
        throw Error();
      }
      resultParams[key] = params[key];
    }
    return `?${createSearchParam(resultParams)}`;
  }

  private _checkParamType(type: ParamType, value: string) {
    if (type === "string" || type === "string?") {
      return true;
    }
    if (type === "url") {
      return value && value === sanitizeUrl(value);
    }
    return false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-my": HaPanelMy;
  }
}
