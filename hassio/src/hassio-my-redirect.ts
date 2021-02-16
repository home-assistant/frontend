import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { sanitizeUrl } from "@braintree/sanitize-url";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../src/common/url/search-params";
import "../../src/layouts/hass-error-screen";
import {
  ParamType,
  Redirect,
  Redirects,
} from "../../src/panels/my/ha-panel-my";
import { navigate } from "../../src/common/navigate";
import { HomeAssistant, Route } from "../../src/types";

const REDIRECTS: Redirects = {
  supervisor_system: {
    redirect: "/hassio/system",
  },
  supervisor_snapshots: {
    redirect: "/hassio/snapshots",
  },
  supervisor_store: {
    redirect: "/hassio/store",
  },
  supervisor: {
    redirect: "/hassio/dashboard",
  },
  supervisor_addon: {
    redirect: "/hassio/addon",
    params: {
      addon: "string",
    },
  },
};

@customElement("hassio-my-redirect")
class HassioMyRedirect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public route!: Route;

  @internalProperty() public _error?: TemplateResult | string;

  connectedCallback() {
    super.connectedCallback();
    const path = this.route.path.substr(1);
    const redirect = REDIRECTS[path];

    if (!redirect) {
      this._error = html`This redirect is not supported by your Home Assistant
        instance. Check the
        <a
          target="_blank"
          rel="noreferrer noopener"
          href="https://my.home-assistant.io/faq.html#supported-pages"
          >My Home Assistant FAQ</a
        >
        for the supported redirects and the version they where introduced.`;
      return;
    }

    let url: string;
    try {
      url = this._createRedirectUrl(redirect);
    } catch (err) {
      this._error = "An unknown error occured";
      return;
    }

    navigate(this, url, true);
  }

  protected render(): TemplateResult {
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
    "hassio-my-redirect": HassioMyRedirect;
  }
}
