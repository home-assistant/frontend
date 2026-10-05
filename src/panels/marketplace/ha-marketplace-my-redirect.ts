import type { ContextType } from "@lit/context";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../common/decorators/consume";
import { navigate } from "../../common/navigate";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../common/url/search-params";
import { internationalizationContext } from "../../data/context";
import "../../layouts/hass-error-screen";
import type { Redirect, Redirects } from "../my/ha-panel-my";
import type { Route } from "../../types";
import type { MarketplaceData } from "../../data/marketplace/marketplace";

const repositoryRedirect: Redirect = {
  redirect: "/marketplace/repository",
  params: {
    owner: "string",
    repository: "string",
    category: "string?",
  },
};

const REDIRECTS: Redirects = {
  hacs_repository: repositoryRedirect,
  marketplace_repository: repositoryRedirect,
};

@customElement("ha-marketplace-my-redirect")
class HaMarketplaceMyRedirect extends LitElement {
  @property({ attribute: false }) public marketplace!: MarketplaceData;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _error?: string;

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);

    const path = this.route.path.substring(1);
    const redirect = REDIRECTS[path];

    if (!redirect) {
      this._error = this._i18n.localize(
        "ui.panel.marketplace.my.not_supported",
        {
          link: html`<a
            target="_blank"
            rel="noreferrer noopener"
            href="https://my.home-assistant.io/faq.html#supported-pages"
          >
            ${this._i18n.localize("ui.panel.marketplace.my.faq_link")}
          </a>`,
        }
      );
      return;
    }

    let url: string;
    try {
      url = this._createRedirectUrl(redirect);
    } catch {
      this._error = this._i18n.localize("ui.panel.marketplace.my.error");
      return;
    }

    navigate(url, { replace: true });
  }

  protected render() {
    if (this._error) {
      return html`<hass-error-screen
        .narrow=${this.narrow}
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
    const resultParams: Record<string, string> = {};
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
    "ha-marketplace-my-redirect": HaMarketplaceMyRedirect;
  }
}
