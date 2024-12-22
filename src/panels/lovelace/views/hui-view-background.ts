import { css, LitElement, nothing } from "lit";
import type { CSSResultGroup, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewBackgroundConfig } from "../../../data/lovelace/config/view";

@customElement("hui-view-background")
export class HUIViewBackground extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) background?:
    | string
    | LovelaceViewBackgroundConfig
    | undefined;

  protected render() {
    return nothing;
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
      const size = background.size ?? "auto";
      const alignment = background.alignment ?? "center";
      const repeat = background.repeat ?? "no-repeat";
      return `${alignment} / ${size} ${repeat} url('${background.image}')`;
    }
    if (typeof background === "string") {
      return background;
    }
    return null;
  }

  private _computeBackgroundOpacityProperty(
    background?: string | LovelaceViewBackgroundConfig
  ) {
    if (typeof background === "object" && background.image) {
      if (background.transparency) {
        return `${background.transparency}%`;
      }
    }
    return null;
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("hass") && this.hass) {
      const oldHass = changedProperties.get("hass");
      if (
        !oldHass ||
        this.hass.themes !== oldHass.themes ||
        this.hass.selectedTheme !== oldHass.selectedTheme
      ) {
        this._applyTheme();
        return;
      }
    }

    if (changedProperties.has("background")) {
      this._applyTheme();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background": HUIViewBackground;
  }
}
