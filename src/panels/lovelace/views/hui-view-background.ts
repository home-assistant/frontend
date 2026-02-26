import { css, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewBackgroundConfig } from "../../../data/lovelace/config/view";
import {
  isMediaSourceContentId,
  resolveMediaSource,
} from "../../../data/media_source";

@customElement("hui-view-background")
export class HUIViewBackground extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) background?:
    | string
    | LovelaceViewBackgroundConfig
    | undefined;

  @state({ attribute: false }) resolvedImage?: string;

  private _resizeObserver?: ResizeObserver;

  private _mutationObserver?: MutationObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this._setUpBackgroundSizeObservers();
    this._updateBackgroundHeight();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearBackgroundSizeObservers();
  }

  protected render() {
    return nothing;
  }

  private _fetchMedia() {
    const backgroundImage =
      typeof this.background === "string"
        ? this.background
        : typeof this.background?.image === "object"
          ? this.background.image.media_content_id
          : this.background?.image;

    if (backgroundImage && isMediaSourceContentId(backgroundImage)) {
      resolveMediaSource(this.hass, backgroundImage).then((result) => {
        this.resolvedImage = result.url;
      });
    } else {
      this.resolvedImage = undefined;
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

    this._updateBackgroundHeight();
  }

  private _setUpBackgroundSizeObservers() {
    const container = this.parentElement;
    if (!container) {
      return;
    }

    this._resizeObserver = new ResizeObserver(() => {
      this._updateBackgroundHeight();
    });
    this._mutationObserver = new MutationObserver(() => {
      this._refreshResizeObserverTargets();
      this._updateBackgroundHeight();
    });

    this._mutationObserver.observe(container, { childList: true });
    this._refreshResizeObserverTargets();
  }

  private _clearBackgroundSizeObservers() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;

    this._mutationObserver?.disconnect();
    this._mutationObserver = undefined;
  }

  private _refreshResizeObserverTargets() {
    if (!this.parentElement || !this._resizeObserver) {
      return;
    }

    this._resizeObserver.disconnect();
    this._resizeObserver.observe(this.parentElement);

    for (const child of Array.from(this.parentElement.children)) {
      if (child !== this) {
        this._resizeObserver.observe(child);
      }
    }
  }

  private _updateBackgroundHeight() {
    if (this.hasAttribute("fixed-background") || !this.parentElement) {
      this.style.removeProperty("--view-background-height");
      return;
    }

    this.style.setProperty(
      "--view-background-height",
      `${this.parentElement.scrollHeight}px`
    );
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
      const image =
        typeof background.image === "object"
          ? background.image.media_content_id || ""
          : background.image;
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
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-attachment: scroll !important;
    }
    :host(:not([fixed-background])) {
      z-index: -1;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: var(--view-background-height, 100%);
    }
    :host {
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
