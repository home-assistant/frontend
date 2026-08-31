import { css, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewBackgroundConfig } from "../../../data/lovelace/config/view";
import {
  isMediaSourceContentId,
  resolveMediaSourceWithCache,
} from "../../../data/media_source";

@customElement("hui-view-background")
export class HUIViewBackground extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) background?:
    string | LovelaceViewBackgroundConfig | undefined;

  @state({ attribute: false }) resolvedImage?: string;

  protected render() {
    return nothing;
  }

  private _getBackgroundImage(
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

  private async _fetchMedia() {
    const backgroundImage = this._getBackgroundImage(this.background);

    if (!backgroundImage || !isMediaSourceContentId(backgroundImage)) {
      this.resolvedImage = undefined;
      return;
    }

    let resolvedUrl: string | undefined;
    try {
      resolvedUrl = (
        await resolveMediaSourceWithCache(this.hass, backgroundImage)
      ).url;
    } catch {
      resolvedUrl = undefined;
    }
    // Discard if the background changed while resolving
    if (this._getBackgroundImage(this.background) === backgroundImage) {
      this.resolvedImage = resolvedUrl;
    }
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
    this.style.setProperty("--view-background", viewBackground);

    const viewBackgroundOpacity = this._computeBackgroundOpacityProperty(
      this.background
    );
    this.style.setProperty("--view-background-opacity", viewBackgroundOpacity);
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
      const image = this._getBackgroundImage(background) || "";
      if (isMediaSourceContentId(image) && !this.resolvedImage) {
        return null;
      }
      const alignment = background.alignment ?? "center";
      const size = background.size ?? "cover";
      const repeat = background.repeat ?? "no-repeat";
      return `${alignment} / ${size} ${repeat} url('${this.hass.hassUrl(this.resolvedImage || image)}')`;
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
      applyTheme = true;
      this._fetchMedia();
    }
    if (changedProperties.has("resolvedImage")) {
      applyTheme = true;
    }
    if (applyTheme) {
      this._applyTheme();
    }
  }

  static styles = css`
    /* Fixed background hack for Safari iOS */
    :host([fixed-background]) {
      display: block;
      z-index: -1;
      position: fixed;
      background-attachment: scroll !important;
    }
    :host(:not([fixed-background])) {
      z-index: -1;
      position: absolute;
    }
    :host {
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      height: 100%;
      width: 100%;
      background: var(
        --view-background,
        var(--lovelace-background, var(--primary-background-color))
      );
      opacity: var(--view-background-opacity);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background": HUIViewBackground;
  }
}
