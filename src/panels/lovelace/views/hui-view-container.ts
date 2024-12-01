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

  render() {
    return html`<slot></slot>`;
  }

  private _applyTheme() {
    if (this.hass) {
      applyThemesOnElement(this, this.hass?.themes, this.theme);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: relative;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-container": HuiViewContainer;
  }
}
