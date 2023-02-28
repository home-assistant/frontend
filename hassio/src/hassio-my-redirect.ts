import { sanitizeUrl } from "@braintree/sanitize-url";
import { html, LitElement, TemplateResult, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../src/common/navigate";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../src/common/url/search-params";
import { Supervisor } from "../../src/data/supervisor/supervisor";
import "../../src/layouts/hass-error-screen";
import {
  ParamType,
  Redirect,
  Redirects,
} from "../../src/panels/my/ha-panel-my";
import { HomeAssistant, Route } from "../../src/types";

export const REDIRECTS: Redirects = {
  supervisor: {
    redirect: "/hassio/dashboard",
  },
  supervisor_logs: {
    redirect: "/hassio/system",
  },
  supervisor_info: {
    redirect: "/hassio/system",
  },
  supervisor_snapshots: {
    redirect: "/hassio/backups",
  },
  supervisor_backups: {
    redirect: "/hassio/backups",
  },
  supervisor_store: {
    redirect: "/hassio/store",
  },
  supervisor_addons: {
    redirect: "/hassio/dashboard",
  },
  supervisor_addon: {
    redirect: "/hassio/addon",
    params: {
      addon: "string",
    },
    optional_params: {
      repository_url: "url",
    },
  },
  supervisor_ingress: {
    redirect: "/hassio/ingress",
    params: {
      addon: "string",
    },
  },
  supervisor_add_addon_repository: {
    redirect: "/hassio/store",
    params: {
      repository_url: "url",
    },
  },
};

@customElement("hassio-my-redirect")
class HassioMyRedirect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public route!: Route;

  @state() public _error?: TemplateResult | string;

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
    } catch (err: any) {
      this._error = this.supervisor.localize("my.error");
      return;
    }

    navigate(url, { replace: true });
  }

  protected render() {
    if (this._error) {
      return html`<hass-error-screen
        .error=${this._error}
      ></hass-error-screen>`;
    }
    return nothing;
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
    Object.entries(redirect.optional_params || {}).forEach(([key, type]) => {
      if (params[key]) {
        if (!this._checkParamType(type, params[key])) {
          throw Error();
        }
        resultParams[key] = params[key];
      }
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
