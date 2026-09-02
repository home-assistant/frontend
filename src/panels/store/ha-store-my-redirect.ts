import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../common/navigate";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../common/url/search-params";
import "../../layouts/hass-error-screen";
import type { Redirect, Redirects } from "../my/ha-panel-my";
import type { HomeAssistant, Route } from "../../types";
import type { StoreData } from "./data/store";

const repositoryRedirect: Redirect = {
  redirect: "/store/repository",
  params: {
    owner: "string",
    repository: "string",
    category: "string?",
  },
};

export const REDIRECTS: Redirects = {
  hacs_repository: repositoryRedirect,
  store_repository: repositoryRedirect,
};

@customElement("ha-store-my-redirect")
class HaStoreMyRedirect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public store!: StoreData;

  @property({ attribute: false }) public route!: Route;

  @state() private _error?: TemplateResult | string;

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);

    const dividerPos = this.route.path.indexOf("/", 1);
    const path = this.route.path.substr(dividerPos + 1);
    const redirect = REDIRECTS[path];

    if (!redirect) {
      this._error = this.hass.localize("ui.panel.store.my.not_supported", {
        link: html`<a
          target="_blank"
          rel="noreferrer noopener"
          href="https://my.home-assistant.io/faq.html#supported-pages"
        >
          ${this.hass.localize("ui.panel.store.my.faq_link")}
        </a>`,
      });
      return;
    }

    let url: string;
    try {
      url = this._createRedirectUrl(redirect);
    } catch {
      this._error = this.hass.localize("ui.panel.store.my.error");
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
    for (const [key, type] of Object.entries(redirect.params || {})) {
      if (!params[key] && type.endsWith("?")) {
        continue;
      }
      if (!params[key]) {
        throw Error();
      }
      resultParams[key] = params[key];
    }
    return `?${createSearchParam(resultParams)}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-store-my-redirect": HaStoreMyRedirect;
  }
}
