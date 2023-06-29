import { mdiPlus } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeRTL } from "../../../common/util/compute_rtl";
import type {
  LovelaceViewConfig,
  LovelaceViewElement,
} from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";
import { HuiErrorCard } from "../cards/hui-error-card";
import { HuiCardOptions } from "../components/hui-card-options";
import { HuiWarning } from "../components/hui-warning";
import type { Lovelace, LovelaceCard } from "../types";

let editCodeLoaded = false;

export class PanelView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public cards: Array<
    LovelaceCard | HuiErrorCard
  > = [];

  @state() private _card?: LovelaceCard | HuiWarning | HuiCardOptions;

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
        ? html`<hui-warning>
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

    const card: LovelaceCard = this.cards[0];
    card.isPanel = true;

    if (this.isStrategy || !this.lovelace?.editMode) {
      card.editMode = false;
      this._card = card;
      return;
    }

    const wrapper = document.createElement("hui-card-options");
    wrapper.hass = this.hass;
    wrapper.lovelace = this.lovelace;
    wrapper.path = [this.index!, 0];
    wrapper.hidePosition = true;
    card.editMode = true;
    wrapper.appendChild(card);
    this._card = wrapper;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        height: 100%;
      }

      ha-fab {
        position: fixed;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }

      ha-fab.rtl {
        float: left;
        right: auto;
        left: calc(16px + env(safe-area-inset-left));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-panel-view": PanelView;
  }
}

customElements.define("hui-panel-view", PanelView);
