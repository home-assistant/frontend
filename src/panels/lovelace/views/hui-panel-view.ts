import { mdiPlus } from "@mdi/js";
import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { computeRTL } from "../../../common/util/compute_rtl";
import type {
  LovelaceViewConfig,
  LovelaceViewElement,
} from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";
import { HuiErrorCard } from "../cards/hui-error-card";
import { HuiCardOptions } from "../components/hui-card-options";
import { HuiWarning } from "../components/hui-warning";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import type { Lovelace, LovelaceCard } from "../types";

let editCodeLoaded = false;

export class PanelView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ attribute: false }) public cards: Array<
    LovelaceCard | HuiErrorCard
  > = [];

  @internalProperty() private _card?:
    | LovelaceCard
    | HuiWarning
    | HuiCardOptions;

  public setConfig(_config: LovelaceViewConfig): void {}

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (this.lovelace?.editMode && !editCodeLoaded) {
      editCodeLoaded = true;
      import(
        /* webpackChunkName: "default-layout-editable" */ "./default-view-editable"
      );
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
      oldLovelace?.config !== this.lovelace?.config ||
      (oldLovelace && oldLovelace?.editMode !== this.lovelace?.editMode)
    ) {
      this._createCard();
    }
  }

  protected render(): TemplateResult {
    return html`
      ${this._card}
      ${this.lovelace?.editMode && this.cards.length === 0
        ? html`
            <mwc-fab
              title=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}
              @click=${this._addCard}
              class=${classMap({
                rtl: computeRTL(this.hass!),
              })}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </mwc-fab>
          `
        : ""}
    `;
  }

  private _addCard(): void {
    showCreateCardDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: this.lovelace!.saveConfig,
      path: [this.index!],
    });
  }

  private _createCard(): void {
    const card: LovelaceCard = this.cards[0];
    card.isPanel = true;

    if (!this.lovelace?.editMode) {
      this._card = card;
      return;
    }

    const wrapper = document.createElement("hui-card-options");
    wrapper.hass = this.hass;
    wrapper.lovelace = this.lovelace;
    wrapper.path = [this.index!, 0];
    card.editMode = true;
    wrapper.appendChild(card);
    this._card = wrapper;

    if (this.cards!.length > 1) {
      const warning = document.createElement("hui-warning");
      warning.setAttribute(
        "style",
        "position: absolute; top: 0; width: 100%; box-sizing: border-box;"
      );
      warning.innerText = this.hass!.localize(
        "ui.panel.lovelace.editor.view.panel_mode.warning_multiple_cards"
      );
      this._card = warning;
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: 100%;
      }

      mwc-fab {
        position: sticky;
        float: right;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }

      mwc-fab.rtl {
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
