import {
  property,
  PropertyValues,
  customElement,
  UpdatingElement,
} from "lit-element";

import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";

import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { createCardElement } from "../common/create-card-element";
import { LovelaceViewConfig } from "../../../data/lovelace";

@customElement("hui-panel-view")
export class HUIPanelView extends UpdatingElement {
  @property() public hass?: HomeAssistant;
  @property() public config?: LovelaceViewConfig;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.style.setProperty("background", "var(--lovelace-background)");
  }

  protected update(changedProperties: PropertyValues): void {
    super.update(changedProperties);

    const hass = this.hass!;
    const hassChanged = changedProperties.has("hass");
    const oldHass = changedProperties.get("hass") as this["hass"] | undefined;
    const configChanged = changedProperties.has("config");

    if (configChanged) {
      this._createCard();
    } else if (hassChanged) {
      (this.lastChild! as LovelaceCard).hass = this.hass;
    }

    if (
      configChanged ||
      (hassChanged &&
        oldHass &&
        (hass.themes !== oldHass.themes ||
          hass.selectedTheme !== oldHass.selectedTheme))
    ) {
      applyThemesOnElement(this, hass.themes, this.config!.theme);
    }
  }

  private _createCard(): void {
    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const card: LovelaceCard = createCardElement(this.config!.cards![0]);
    card.hass = this.hass;
    card.isPanel = true;
    this.appendChild(card);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-panel-view": HUIPanelView;
  }
}
