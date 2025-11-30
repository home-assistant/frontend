import { sanitizeUrl } from "@braintree/sanitize-url";
import type { TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../src/common/navigate";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../src/common/url/search-params";
import type { Supervisor } from "../../src/data/supervisor/supervisor";
import "../../src/layouts/hass-error-screen";
import type {
  ParamType,
  Redirect,
  Redirects,
} from "../../src/panels/my/ha-panel-my";
import type { HomeAssistant, Route } from "../../src/types";

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
    redirect: "/config/apps/available",
  },
  supervisor_addons: {
    redirect: "/config/apps",
  },
  supervisor_addon: {
    redirect: "/config/app",
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
    redirect: "/config/apps/available",
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
      this._error = this.supervisor.localize("my.not_supported", {
        link: html`<a
          target="_blank"
          rel="noreferrer noopener"
          href="https://my.home-assistant.io/faq.html#supported-pages"
        >
          ${this.supervisor.localize("my.faq_link")}
        </a>`,
      });
      return;
    }

    let url: string;
    try {
      url = this._createRedirectUrl(redirect);
    } catch (_err: any) {
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
    const params = extractSearchParamsObject();

    // Special case for supervisor_addon: use path-based URL
    if (params.addon && redirect.redirect === "/config/app") {
      const addon = params.addon;
      delete params.addon;
      const remainingParams = this._createRedirectParams({
        ...redirect,
        params: {},
      });
      return `/config/app/${addon}/info${remainingParams}`;
    }

    const resultParams = this._createRedirectParams(redirect);
    return `${redirect.redirect}${resultParams}`;
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
