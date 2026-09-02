import type { TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../homeassistant-frontend/src/common/navigate";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../homeassistant-frontend/src/common/url/search-params";
import "../homeassistant-frontend/src/layouts/hass-error-screen";
import type {
  ParamType,
  Redirect,
  Redirects,
} from "../homeassistant-frontend/src/panels/my/ha-panel-my";
import type { HomeAssistant, Route } from "../homeassistant-frontend/src/types";
import type { Hacs } from "./data/hacs";

export const REDIRECTS: Redirects = {
  hacs_repository: {
    redirect: "/hacs/repository",
    params: {
      owner: "string",
      repository: "string",
      category: "string?",
    },
  },
};

@customElement("hacs-my-redirect")
class HacsMyRedirect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public hacs!: Hacs;

  @property({ attribute: false }) public route!: Route;

  @state() private _error?: TemplateResult | string;

  protected firstUpdated(_changedProperties): void {
    const dividerPos = this.route.path.indexOf("/", 1);
    const path = this.route.path.substr(dividerPos + 1);
    const redirect = REDIRECTS[path];

    if (!redirect) {
      this._error = this.hacs.localize("my.not_supported", {
        link: html`<a
          target="_blank"
          rel="noreferrer noopener"
          href="https://my.home-assistant.io/faq.html#supported-pages"
        >
          ${this.hacs.localize("my.faq_link")}
        </a>`,
      });
      return;
    }

    let url: string;
    try {
      url = this._createRedirectUrl(redirect);
    } catch (err: any) {
      this._error = this.hacs.localize("my.error");
      return;
    }

    navigate(url, { replace: true });
  }

  protected render() {
    if (this._error) {
      return html`<hass-error-screen .error=${this._error}></hass-error-screen>`;
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
    for (const [key, type] of Object.entries(redirect.params || {})) {
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

  private _checkParamType(type: ParamType, _value: string) {
    return type === "string" || type === "string?";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hacs-my-redirect": HacsMyRedirect;
  }
}
