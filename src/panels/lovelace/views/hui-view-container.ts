import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { listenMediaQuery } from "../../../common/dom/media_query";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";

type BackgroundConfig = LovelaceViewConfig["background"];

@customElement("hui-view-container")
class HuiViewContainer extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @property({ attribute: false }) background?: BackgroundConfig;

  @property({ attribute: false }) theme?: LovelaceViewConfig["theme"];

  @state() themeBackground?: string;

  private _unsubMediaQuery?: () => void;

  public connectedCallback(): void {
    super.connectedCallback();
    this._setUpMediaQuery();
    this._applyTheme();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearmediaQuery();
  }

  private _clearmediaQuery() {
    if (this._unsubMediaQuery) {
      this._unsubMediaQuery();
      this._unsubMediaQuery = undefined;
    }
  }

  private _setUpMediaQuery() {
    this._unsubMediaQuery = listenMediaQuery(
      "(prefers-color-scheme: dark)",
      this._applyTheme.bind(this)
    );
  }

  private _isFixedBackground(background?: BackgroundConfig) {
    if (typeof background === "string") {
      return background.split(" ").includes("fixed");
    }
    return false;
  }

  private _computeBackgroundProperty(background?: BackgroundConfig) {
    if (typeof background === "object" && background.image) {
      if (background.tile) {
        return `top / auto repeat url('${background.image}')`;
      }
      let size = "auto";
      if (background.size in ["original", "fill_view", "fit_view"]) {
        size = background.size;
      }
      let alignment = "center";
      if (
        background.size in
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
        ]
      ) {
        alignment = background.alignment;
      }
      return `${alignment} / ${size} no-repeat url('${background.image}')`;
    }
    if (typeof background === "string") {
      return background;
    }
    return null;
  }

  private _computeBackgroundOpacityProperty(background?: BackgroundConfig) {
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

    if (changedProperties.has("theme") || changedProperties.has("background")) {
      this._applyTheme();
    }
  }

  render() {
    return html`<slot></slot>`;
  }

  private _applyTheme() {
    if (this.hass) {
      applyThemesOnElement(this, this.hass?.themes, this.theme);
    }

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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: relative;
      }
      /* Fixed background hack for Safari iOS */
      :host([fixed-background]) ::slotted(*):before {
        display: block;
        content: "";
        z-index: -1;
        position: fixed;
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
        opacity: var(--view-background-opacity)
        background-attachment: scroll !important;
      }
      :host(:not([fixed-background])) {
        background: var(
          --view-background,
          var(--lovelace-background, var(--primary-background-color))
        );
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-container": HuiViewContainer;
  }
}
