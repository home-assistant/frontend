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

const REDIRECTS = {
  info: {
    redirect: "/config/info",
  },
  logs: {
    redirect: "/config/logs",
  },
  profile: {
    redirect: "/profile/dashboard",
  },
  blueprint_import: {
    redirect: "/config/blueprint/dashboard/import",
    params: {
      blueprint_url: "url",
    },
  },
  config_flow_start: {
    redirect: "/config/integrations/add",
    params: {
      domain: "string",
    },
  },
};

type ParamType = "url" | "string";

interface Redirect {
  redirect: string;
  params?: {
    [key: string]: ParamType;
  };
}

@customElement("ha-panel-my")
class HaPanelMy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public route!: Route;

  @internalProperty() public _error = "";

  connectedCallback() {
    super.connectedCallback();
    const path = this.route.path.substr(1);
    const redirect: Redirect | undefined = REDIRECTS[path];

    if (!redirect) {
      this._error = this.hass.localize(
        "ui.panel.my.not_supported",
        "link",
        html`<a
          target="_blank"
          rel="noreferrer noopener"
          href="https://my.home-assistant.io/faq.html#supported-pages"
          >${this.hass.localize("ui.panel.my.faq_link")}</a
        >`
      );
      return;
    }

    let url: string;
    try {
      url = this._createRedirectUrl(redirect);
    } catch (err) {
      this._error = this.hass.localize("ui.panel.my.error");
      return;
    }

    navigate(this, url, true);
  }

  protected render() {
    if (this._error) {
      return html`<hass-error-screen
        .error=${this._error}
      ></hass-error-screen>`;
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
