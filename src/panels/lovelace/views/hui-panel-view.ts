import { mdiPlus } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeRTL } from "../../../common/util/compute_rtl";
import type { LovelaceViewElement } from "../../../data/lovelace";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { HuiCard } from "../cards/hui-card";
import type { HuiCardOptions } from "../components/hui-card-options";
import type { HuiWarning } from "../components/hui-warning";
import type { Lovelace } from "../types";

let editCodeLoaded = false;

export class PanelView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ attribute: false }) public isStrategy = false;

  @property({ attribute: false }) public cards: HuiCard[] = [];

  @state() private _card?: HuiCard | HuiWarning | HuiCardOptions;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public setConfig(_config: LovelaceViewConfig): void {}

  public willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (this.lovelace?.editMode && !editCodeLoaded) {
      editCodeLoaded = true;
      import("./default-view-editable");
    }

    if (changedProperties.has("cards")) {
      this._createCard();
    }

    if (!changedProperties.has("lovelace")) {
      return;
    }

    const oldLovelace = changedProperties.get("lovelace") as
      | Lovelace
      | undefined;

    if (
      (!changedProperties.has("cards") &&
        oldLovelace?.config !== this.lovelace?.config) ||
      (oldLovelace && oldLovelace?.editMode !== this.lovelace?.editMode)
    ) {
      this._createCard();
    }
  }

  protected render(): TemplateResult {
    return html`
      ${this.cards!.length > 1
        ? html`<hui-warning .hass=${this.hass}>
            ${this.hass!.localize(
              "ui.panel.lovelace.editor.view.panel_mode.warning_multiple_cards"
            )}
          </hui-warning>`
        : ""}
      ${this._card}
      ${this.lovelace?.editMode && this.cards.length === 0
        ? html`
            <ha-fab
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}
              extended
              @click=${this._addCard}
              class=${classMap({
                rtl: computeRTL(this.hass!),
              })}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </ha-fab>
          `
        : ""}
    `;
  }

  private _addCard(): void {
    fireEvent(this, "ll-create-card");
  }

  private _createCard(): void {
    if (this.cards.length === 0) {
      this._card = undefined;
      return;
    }

    const card: HuiCard = this.cards[0];
    card.layout = "panel";

    if (this.isStrategy || !this.lovelace?.editMode) {
      card.preview = false;
      this._card = card;
      return;
    }

    const wrapper = document.createElement("hui-card-options");
    wrapper.hass = this.hass;
    wrapper.lovelace = this.lovelace;
    wrapper.path = [this.index!, 0];
    wrapper.hidePosition = true;
    card.preview = true;
    wrapper.appendChild(card);
    this._card = wrapper;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
      --restore-card-border-radius: var(--ha-card-border-radius, 12px);
      --restore-card-border-width: var(--ha-card-border-width, 1px);
      --restore-card-box-shadow: var(--ha-card-box-shadow, none);
    }

    * {
      --ha-card-border-radius: 0;
      --ha-card-border-width: 0;
      --ha-card-box-shadow: none;
    }

    ha-fab {
      position: fixed;
      right: calc(16px + var(--safe-area-inset-right));
      bottom: calc(16px + var(--safe-area-inset-bottom));
      z-index: 1;
      float: var(--float-end);
      inset-inline-end: calc(16px + var(--safe-area-inset-right));
      inset-inline-start: initial;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-panel-view": PanelView;
  }
}

customElements.define("hui-panel-view", PanelView);
