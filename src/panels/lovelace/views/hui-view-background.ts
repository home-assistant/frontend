import { css, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewBackgroundConfig } from "../../../data/lovelace/config/view";
import { deepEqual } from "../../../common/util/deep-equal";
import {
  isMediaSourceContentId,
  resolveMediaSource,
} from "../../../data/media_source";

const mediaSourceUrlCache = new Map<string, string>();

@customElement("hui-view-background")
export class HUIViewBackground extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) background?:
    | string
    | LovelaceViewBackgroundConfig
    | undefined;

  @state({ attribute: false }) resolvedImage?: string;

  private _currentMediaContentId?: string;

  private _pendingMediaContentId?: string;

  protected render() {
    return nothing;
  }

  private _fetchMedia() {
    const backgroundImage = this._getBackgroundImageSource(this.background);

    if (this._currentMediaContentId === backgroundImage) {
      return;
    }
    this._currentMediaContentId = backgroundImage;

    if (backgroundImage && isMediaSourceContentId(backgroundImage)) {
      const cachedImage = mediaSourceUrlCache.get(backgroundImage);
      if (cachedImage) {
        this._pendingMediaContentId = undefined;
        this.resolvedImage = cachedImage;
        return;
      }
      this._pendingMediaContentId = backgroundImage;
      resolveMediaSource(this.hass, backgroundImage).then((result) => {
        if (this._pendingMediaContentId !== backgroundImage) {
          return;
        }
        mediaSourceUrlCache.set(backgroundImage, result.url);
        this._pendingMediaContentId = undefined;
        this.resolvedImage = result.url;
      });
      return;
    }

    this._pendingMediaContentId = undefined;
    this.resolvedImage = undefined;
  }

  private _applyTheme() {
    const computedStyles = getComputedStyle(this);
    const themeBackground = computedStyles.getPropertyValue(
      "--lovelace-background"
    );

    const fixedBackground = this._isFixedBackground(
      this.background || themeBackground
    );
    const viewBackground = this._computeBackgroundProperty(this.background);
    this.toggleAttribute("fixed-background", fixedBackground);
    if (viewBackground !== null) {
      this.style.setProperty("--view-background", viewBackground);
    } else if (!this._isPendingMediaSourceBackground()) {
      this.style.removeProperty("--view-background");
    }

    const viewBackgroundOpacity = this._computeBackgroundOpacityProperty(
      this.background
    );
    if (viewBackgroundOpacity !== null) {
      this.style.setProperty(
        "--view-background-opacity",
        viewBackgroundOpacity
      );
    } else {
      this.style.removeProperty("--view-background-opacity");
    }
  }

  private _isFixedBackground(
    background?: string | LovelaceViewBackgroundConfig
  ) {
    if (typeof background === "string") {
      return background.split(" ").includes("fixed");
    }
    if (typeof background === "object" && background.attachment === "fixed") {
      return true;
    }
    return false;
  }

  private _computeBackgroundProperty(
    background?: string | LovelaceViewBackgroundConfig
  ) {
    if (typeof background === "object" && background.image) {
      const image = this._getBackgroundImageSource(background);
      if (image && isMediaSourceContentId(image) && !this.resolvedImage) {
        return null;
      }
      const alignment = background.alignment ?? "center";
      const size = background.size ?? "cover";
      const repeat = background.repeat ?? "no-repeat";
      return `${alignment} / ${size} ${repeat} url('${this.hass.hassUrl(this.resolvedImage || image || "")}')`;
    }
    if (typeof background === "string") {
      if (isMediaSourceContentId(background) && !this.resolvedImage) {
        return null;
      }
      return this.resolvedImage || background;
    }
    return null;
  }

  private _computeBackgroundOpacityProperty(
    background?: string | LovelaceViewBackgroundConfig
  ) {
    if (typeof background === "object" && background.image) {
      if (background.opacity) {
        return `${background.opacity}%`;
      }
    }
    return null;
  }

  private _getBackgroundImageSource(
    background?: string | LovelaceViewBackgroundConfig
  ): string | undefined {
    if (typeof background === "string") {
      return background;
    }
    if (typeof background?.image === "object") {
      return background.image.media_content_id;
    }
    return background?.image;
  }

  private _isPendingMediaSourceBackground() {
    const backgroundImage = this._getBackgroundImageSource(this.background);
    if (!backgroundImage || !isMediaSourceContentId(backgroundImage)) {
      return false;
    }
    return (
      this._pendingMediaContentId === backgroundImage && !this.resolvedImage
    );
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    let applyTheme = false;
    if (changedProperties.has("hass") && this.hass) {
      const oldHass = changedProperties.get("hass");
      if (
        !oldHass ||
        this.hass.themes !== oldHass.themes ||
        this.hass.selectedTheme !== oldHass.selectedTheme
      ) {
        applyTheme = true;
      }
    }

    if (changedProperties.has("background")) {
      const oldBackground = changedProperties.get(
        "background"
      ) as this["background"];
      if (!deepEqual(this.background, oldBackground)) {
        applyTheme = true;
        this._fetchMedia();
      }
    }
    if (changedProperties.has("resolvedImage")) {
      applyTheme = true;
    }
    if (applyTheme) {
      this._applyTheme();
    }
  }

  static styles = css`
    :host {
      display: block;
      background: var(
        --view-background,
        var(--lovelace-background, var(--primary-background-color))
      );
      opacity: var(--view-background-opacity, 1);
      transition: background 0.3s ease;
    }
    /* Fixed background hack for Safari iOS */
    :host([fixed-background]) {
      background-attachment: scroll !important;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background": HUIViewBackground;
  }
}
