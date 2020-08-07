import {
  property,
  PropertyValues,
  TemplateResult,
  html,
  LitElement,
  css,
  CSSResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { mdiPlus } from "@mdi/js";

import type { HomeAssistant } from "../../../types";
import type { Lovelace, LovelaceCard } from "../types";
import type { LovelaceViewElement } from "../../../data/lovelace";

import { HuiErrorCard } from "../cards/hui-error-card";
import { computeRTL } from "../../../common/util/compute_rtl";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";

let editCodeLoaded = false;

export class PanelView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Number }) public columns!: number;

  @property({ attribute: false }) public cards: Array<
    LovelaceCard | HuiErrorCard
  > = [];

  @property({ type: Boolean }) public editMode = false;

  public constructor() {
    super();
    this.style.setProperty("background", "var(--lovelace-background)");
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (this.editMode && !editCodeLoaded) {
      editCodeLoaded = true;
      import(
        /* webpackChunkName: "default-layout-editable" */ "./default-view-editable"
      );
    }

    this._createCard();
  }

  protected render(): TemplateResult {
    return html`
      <div id="card"></div>
      ${this.editMode && this.cards.length === 0
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
              <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
            </mwc-fab>
          `
        : ""}
    `;
  }

  private _addCard(): void {
    showEditCardDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: this.lovelace!.saveConfig,
      path: [this.index!],
    });
  }

  private _createCard(): void {
    const root = this.shadowRoot!.querySelector("#card")!;
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const card: LovelaceCard = this.cards[0];
    card.isPanel = true;

    if (!this.lovelace!.editMode) {
      root.appendChild(card);
      return;
    }

    const wrapper = document.createElement("hui-card-options");
    wrapper.hass = this.hass;
    wrapper.lovelace = this.lovelace;
    wrapper.path = [this.index!, 0];
    card.editMode = true;
    wrapper.appendChild(card);
    root.appendChild(wrapper);

    if (this.cards!.length > 1) {
      const warning = document.createElement("hui-warning");
      warning.setAttribute(
        "style",
        "position: absolute; top: 0; width: 100%; box-sizing: border-box;"
      );
      warning.innerText = this.hass!.localize(
        "ui.panel.lovelace.editor.view.panel_mode.warning_multiple_cards"
      );
      root.appendChild(warning);
    }
  }

  static get styles(): CSSResult {
    return css`
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
    "ll-view-panel": PanelView;
  }
}

customElements.define("ll-view-panel", PanelView);
