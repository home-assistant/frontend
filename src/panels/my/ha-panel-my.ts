import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import { sanitizeUrl } from "@braintree/sanitize-url";
import { navigate } from "../../common/navigate";
import { HomeAssistant, Route } from "../../types";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../common/url/search-params";
import "../../layouts/hass-error-screen";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { domainToName } from "../../data/integration";

const REDIRECTS: Redirects = {
  developer_states: {
    redirect: "/developer-tools/state",
  },
  developer_services: {
    redirect: "/developer-tools/service",
  },
  developer_template: {
    redirect: "/developer-tools/template",
  },
  developer_events: {
    redirect: "/developer-tools/event",
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
  devices: {
    redirect: "/config/devices/dashboard",
  },
  entities: {
    redirect: "/config/entities",
  },
  areas: {
    redirect: "/config/areas/dashboard",
  },
  blueprints: {
    redirect: "/config/blueprint/dashboard",
  },
  blueprint_import: {
    redirect: "/config/blueprint/dashboard/import",
    params: {
      blueprint_url: "url",
    },
  },
  automations: {
    redirect: "/config/automation/dashboard",
  },
  scenes: {
    redirect: "/config/scene/dashboard",
  },
  scripts: {
    redirect: "/config/script/dashboard",
  },
  helpers: {
    redirect: "/config/helpers",
  },
  tags: {
    redirect: "/config/tags",
  },
  lovelace_dashboards: {
    redirect: "/config/lovelace/dashboards",
  },
  lovelace_resources: {
    redirect: "/config/lovelace/resources",
  },
  people: {
    redirect: "/config/person",
  },
  zones: {
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

  @internalProperty() public _error?: string;

  connectedCallback() {
    super.connectedCallback();
    const path = this.route.path.substr(1);

    if (path.startsWith("supervisor")) {
      if (!isComponentLoaded(this.hass, "hassio")) {
        this._error = "no_supervisor";
        return;
      }
      navigate(
        this,
        `/hassio/_my_redirect/${path}${window.location.search}`,
        true
      );
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

    navigate(this, url, true);
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
          error =
            this.hass.localize(
              "ui.panel.my.component_not_loaded",
              "integration",
              "Home Assistant Supervisor"
            ) || "This redirect requires Home Assistant Supervisor.";
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
