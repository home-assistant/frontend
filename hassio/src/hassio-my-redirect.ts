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
import { Supervisor } from "../../src/data/supervisor/supervisor";

const REDIRECTS: Redirects = {
  supervisor_logs: {
    redirect: "/hassio/system",
  },
  supervisor_info: {
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

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public route!: Route;

  @internalProperty() public _error?: TemplateResult | string;

  connectedCallback() {
    super.connectedCallback();
    const path = this.route.path.substr(1);
    const redirect = REDIRECTS[path];

    if (!redirect) {
      this._error = this.supervisor.localize(
        "my.not_supported",
        "link",
        html`<a
          target="_blank"
          rel="noreferrer noopener"
          href="https://my.home-assistant.io/faq.html#supported-pages"
        >
          ${this.supervisor.localize("my.faq_link")}
        </a>`
      );
      return;
    }

    let url: string;
    try {
      url = this._createRedirectUrl(redirect);
    } catch (err) {
      this._error = this.supervisor.localize("my.error");
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
