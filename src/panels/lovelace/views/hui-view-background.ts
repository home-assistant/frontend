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
      return background.includes(" fixed");
    }
    return false;
  }

  private _computeBackgroundProperty(
    background?: string | LovelaceViewBackgroundConfig
  ) {
    if (typeof background === "object" && background.image) {
      let size = "auto";
      if (
        background.size &&
        ["original", "fill_view", "fit_view"].includes(background.size)
      ) {
        size = {
          fill_view: "cover",
          fit_view: "contain",
          original: "auto",
        }[background.size];
      }
      let alignment = "center";
      if (
        background.alignment &&
        [
          "top_left",
          "top_center",
          "top_right",
          "center_left",
          "center",
          "center_right",
          "bottom_left",
          "bottom_center",
          "bottom_right",
        ].includes(background.alignment)
      ) {
        alignment = background.alignment.replace("_", " ");
      }
      return `${alignment} / ${size} ${background.tile ? "repeat" : "no-repeat"} url('${background.image}')`;
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
      :host {
        z-index: -1;
        position: absolute;
        height: 100%;
        width: 100%;
        background: var(
          --view-background,
          var(--lovelace-background, var(--primary-background-color))
        );
        opacity: var(--view-background-opacity);
        background-attachment: scroll !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background": HUIViewBackground;
  }
}
