import { sanitizeUrl } from "@braintree/sanitize-url";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { navigate } from "../../common/navigate";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../common/url/search-params";
import { domainToName } from "../../data/integration";
import "../../layouts/hass-error-screen";
import { HomeAssistant, Route } from "../../types";
import { documentationUrl } from "../../util/documentation-url";

const REDIRECTS: Redirects = {
  developer_states: {
    redirect: "/developer-tools/state",
  },
  developer_services: {
    redirect: "/developer-tools/service",
  },
  developer_call_service: {
    redirect: "/developer-tools/service",
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
  config: {
    redirect: "/config",
  },
  cloud: {
    component: "cloud",
    redirect: "/config/cloud",
  },
  integrations: {
    redirect: "/config/integrations",
  },
  config_flow_start: {
    redirect: "/config/integrations/add",
    params: {
      domain: "string",
    },
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
  config_energy: {
    component: "energy",
    redirect: "/config/energy/dashboard",
  },
  devices: {
    redirect: "/config/devices/dashboard",
  },
  entities: {
    redirect: "/config/entities",
  },
  energy: {
    component: "energy",
    redirect: "/energy",
  },
  areas: {
    redirect: "/config/areas/dashboard",
  },
  blueprints: {
    component: "blueprint",
    redirect: "/config/blueprint/dashboard",
  },
  blueprint_import: {
    component: "blueprint",
    redirect: "/config/blueprint/dashboard/import",
    params: {
      blueprint_url: "url",
    },
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
  lovelace_dashboards: {
    component: "lovelace",
    redirect: "/config/lovelace/dashboards",
  },
  lovelace_resources: {
    component: "lovelace",
    redirect: "/config/lovelace/resources",
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
    redirect: "/config/core",
  },
  server_controls: {
    redirect: "/config/server_control",
  },
  logs: {
    redirect: "/config/logs",
  },
  info: {
    redirect: "/config/info",
  },
  customize: {
    redirect: "/config/customize",
  },
  profile: {
    redirect: "/profile/dashboard",
  },
  logbook: {
    component: "logbook",
    redirect: "/logbook",
  },
  history: {
    component: "history",
    redirect: "/history",
  },
};

export type ParamType = "url" | "string";

export type Redirects = { [key: string]: Redirect };
export interface Redirect {
  redirect: string;
  component?: string;
  params?: {
    [key: string]: ParamType;
  };
}

@customElement("ha-panel-my")
class HaPanelMy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public route!: Route;

  @state() public _error?: string;

  connectedCallback() {
    super.connectedCallback();
    const path = this.route.path.substr(1);

    if (path.startsWith("supervisor")) {
      if (!isComponentLoaded(this.hass, "hassio")) {
        this._error = "no_supervisor";
        return;
      }
      navigate(`/hassio/_my_redirect/${path}${window.location.search}`, {
        replace: true,
      });
      return;
    }

    const redirect = REDIRECTS[path];

    if (!redirect) {
      this._error = "not_supported";
      return;
    }

    if (
      redirect.component &&
      !isComponentLoaded(this.hass, redirect.component)
    ) {
      this._error = "no_component";
      return;
    }

    let url: string;
    try {
      url = this._createRedirectUrl(redirect);
    } catch (err) {
      this._error = "url_error";
      return;
    }

    navigate(url, { replace: true });
  }

  protected render() {
    if (this._error) {
      let error = "Unknown error";
      switch (this._error) {
        case "not_supported":
          error =
            this.hass.localize(
              "ui.panel.my.not_supported",
              "link",
              html`<a
                target="_blank"
                rel="noreferrer noopener"
                href="https://my.home-assistant.io/faq.html#supported-pages"
                >${this.hass.localize("ui.panel.my.faq_link")}</a
              >`
            ) || "This redirect is not supported.";
          break;
        case "no_component":
          error =
            this.hass.localize(
              "ui.panel.my.component_not_loaded",
              "integration",
              domainToName(
                this.hass.localize,
                REDIRECTS[this.route.path.substr(1)].component!
              )
            ) || "This redirect is not supported.";
          break;
        case "no_supervisor":
          error = this.hass.localize(
            "ui.panel.my.no_supervisor",
            "docs_link",
            html`<a
              target="_blank"
              rel="noreferrer noopener"
              href="${documentationUrl(this.hass, "/installation")}"
              >${this.hass.localize("ui.panel.my.documentation")}</a
            >`
          );
          break;
        default:
          error = this.hass.localize("ui.panel.my.error") || "Unknown error";
      }
      return html`<hass-error-screen .error=${error}></hass-error-screen>`;
    }
    return html``;
  }

  private _createRedirectUrl(redirect: Redirect): string {
    const params = this._createRedirectParams(redirect);
    return `${redirect.redirect}${params}`;
  }

  private _createRedirectParams(redirect: Redirect): string {
    const params = extractSearchParamsObject();
    if (!redirect.params && !Object.keys(params).length) {
      return "";
    }
    const resultParams = {};
    Object.entries(redirect.params || {}).forEach(([key, type]) => {
      if (!params[key] || !this._checkParamType(type, params[key])) {
        throw Error();
      }
      resultParams[key] = params[key];
    });
    return `?${createSearchParam(resultParams)}`;
  }

  private _checkParamType(type: ParamType, value: string) {
    if (type === "string") {
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
