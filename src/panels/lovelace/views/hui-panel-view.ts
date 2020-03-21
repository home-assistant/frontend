import {
  property,
  PropertyValues,
  customElement,
  UpdatingElement,
} from "lit-element";

import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";

import { HomeAssistant } from "../../../types";
import { LovelaceCard, Lovelace } from "../types";
import { createCardElement } from "../create-element/create-card-element";
import { LovelaceViewConfig } from "../../../data/lovelace";

let editCodeLoaded = false;

@customElement("hui-panel-view")
export class HUIPanelView extends UpdatingElement {
  @property() public hass?: HomeAssistant;
  @property() public lovelace?: Lovelace;
  @property() public config?: LovelaceViewConfig;
  @property({ type: Number }) public index!: number;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.style.setProperty("background", "var(--lovelace-background)");
  }

  protected update(changedProperties: PropertyValues): void {
    super.update(changedProperties);

    const hass = this.hass!;
    const lovelace = this.lovelace!;
    const hassChanged = changedProperties.has("hass");
    const oldHass = changedProperties.get("hass") as this["hass"] | undefined;
    const configChanged = changedProperties.has("config");

    if (lovelace.editMode && !editCodeLoaded) {
      editCodeLoaded = true;
      import(/* webpackChunkName: "hui-view-editable" */ "./hui-view-editable");
    }

    let editModeChanged = false;

    if (changedProperties.has("lovelace")) {
      const oldLovelace = changedProperties.get("lovelace") as Lovelace;
      editModeChanged =
        !oldLovelace || lovelace.editMode !== oldLovelace.editMode;
    }

    if (editModeChanged || configChanged) {
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
    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const card: LovelaceCard = createCardElement(this.config!.cards![0]);
    card.hass = this.hass;
    card.isPanel = true;

    if (!this.lovelace!.editMode) {
      this.appendChild(card);
      return;
    }

    const wrapper = document.createElement("hui-card-options");
    wrapper.hass = this.hass;
    wrapper.lovelace = this.lovelace;
    wrapper.path = [this.index, 0];
    card.editMode = true;
    wrapper.appendChild(card);
    this.appendChild(wrapper);
    if (this.config!.cards!.length > 1) {
      const warning = document.createElement("hui-warning");
      warning.setAttribute(
        "style",
        "position: absolute; top: 0; width: 100%; box-sizing: border-box;"
      );
      warning.innerText = this.hass!.localize(
        "ui.panel.lovelace.editor.view.panel_mode.warning_multiple_cards"
      );
      this.appendChild(warning);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-panel-view": HUIPanelView;
  }
}
