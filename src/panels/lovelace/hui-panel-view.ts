import {
  html,
  css,
  CSSResult,
  LitElement,
  property,
  query,
  PropertyValues,
  TemplateResult,
  customElement,
} from "lit-element";

import { classMap } from "lit-html/directives/class-map";

import applyThemesOnElement from "../../common/dom/apply_themes_on_element";

import { HomeAssistant } from "../../types";
import { LovelaceCard } from "./types";
import { createCardElement } from "./common/create-card-element";
import { LovelaceViewConfig } from "../../data/lovelace";

@customElement("hui-panel-view")
export class HUIPanelView extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public config?: LovelaceViewConfig;
  @property() public tabsHidden = false;
  @query("#panel") private _panel;

  protected render(): TemplateResult | void {
    return html`
      <div
        id="panel"
        class="${classMap({
          "tabs-hidden": this.tabsHidden,
        })}"
      ></div>
    `;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const hass = this.hass!;
    const hassChanged = changedProperties.has("hass");
    const oldHass = changedProperties.get("hass") as this["hass"] | undefined;

    if (changedProperties.has("config")) {
      this._createCard();
    } else if (hassChanged) {
      this._panel.lastChild.hass = this.hass;
    }

    if (
      hassChanged &&
      oldHass &&
      (hass.themes !== oldHass.themes ||
        hass.selectedTheme !== oldHass.selectedTheme)
    ) {
      applyThemesOnElement(this, hass.themes, this.config!.theme);
    }
  }

  private _createCard(): void {
    const panel = this._panel;

    if (panel.lastChild) {
      panel.removeChild(panel.lastChild);
    }

    const card: LovelaceCard = createCardElement(this.config!.cards![0]);
    card.hass = this.hass;
    card.isPanel = true;
    panel.append(card);
  }

  static get styles(): CSSResult {
    return css`
      #panel {
        background: var(--lovelace-background);
        min-height: calc(100vh - 112px);
        display: flex;
      }
      #panel.tabs-hidden {
        min-height: calc(100vh - 64px);
      }
      #panel > * {
        flex: 1;
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-panel-view": HUIPanelView;
  }
}
