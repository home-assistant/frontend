import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { HomeAssistant } from "../../types";
import {
  brandsUrl,
  extractDomainFromBrandUrl,
  isBrandUrl,
} from "../../util/brands-url";

const SMALL_THUMBNAIL_THRESHOLD = 16;

const isSvgUrl = (url: string): boolean =>
  /\.svg(\?|#|$)/i.test(url) || url.startsWith("data:image/svg+xml");

const resolveThumbnailURL = (
  hass: HomeAssistant,
  thumbnailUrl: string
): Promise<string> => {
  if (isBrandUrl(thumbnailUrl)) {
    return Promise.resolve(
      brandsUrl(
        {
          domain: extractDomainFromBrandUrl(thumbnailUrl),
          type: "icon",
          darkOptimized: hass.themes?.darkMode,
        },
        hass.auth.data.hassUrl
      )
    );
  }
  if (thumbnailUrl.startsWith("/")) {
    // Local thumbnails require authentication; fetch and inline as base64.
    return hass
      .fetchWithAuth(thumbnailUrl)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve(typeof reader.result === "string" ? reader.result : "");
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blob);
          })
      );
  }
  return Promise.resolve(thumbnailUrl);
};

@customElement("ha-media-browser-thumbnail")
export class HaMediaBrowserThumbnail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public url?: string;

  @state() private _resolvedUrl?: string;

  @state() private _small = false;

  @state() private _brand = false;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("url")) {
      this._resolve();
    }
  }

  private async _resolve(): Promise<void> {
    this._small = false;
    this._brand = !!this.url && isBrandUrl(this.url);
    if (!this.url) {
      this._resolvedUrl = undefined;
      return;
    }
    const requested = this.url;
    try {
      const resolved = await resolveThumbnailURL(this.hass, requested);
      if (requested !== this.url) return;
      this._resolvedUrl = resolved;
      this._probeSize(resolved);
    } catch (_err) {
      if (requested === this.url) this._resolvedUrl = undefined;
    }
  }

  private _probeSize(url: string): void {
    // SVGs (including brand icons) scale natively; pixelated rendering would
    // break vector output.
    if (this.url && isBrandUrl(this.url)) return;
    if (isSvgUrl(url)) return;
    const img = new Image();
    img.addEventListener("load", () => {
      if (this._resolvedUrl !== url) return;
      if (
        img.naturalWidth > 0 &&
        img.naturalWidth <= SMALL_THUMBNAIL_THRESHOLD
      ) {
        this._small = true;
      }
    });
    img.src = url;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._resolvedUrl) return nothing;
    return html`
      <div
        class=${classMap({
          image: true,
          small: this._small,
          brand: this._brand,
        })}
        style="background-image: url(${this._resolvedUrl})"
      ></div>
    `;
  }

  static readonly styles: CSSResultGroup = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .image {
      width: 100%;
      height: 100%;
      background-size: var(--ha-media-browser-thumbnail-fit, contain);
      background-repeat: no-repeat;
      background-position: center;
    }
    .image.brand {
      background-size: 40%;
    }
    .image.small {
      image-rendering: pixelated;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-browser-thumbnail": HaMediaBrowserThumbnail;
  }
}
