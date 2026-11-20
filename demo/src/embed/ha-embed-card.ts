import { css, html } from "lit";
import { customElement } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import type { LovelaceCardConfig } from "../../../src/data/lovelace/config/card";
import { computeCardGridSize } from "../../../src/panels/lovelace/common/compute-card-grid-size";
import "../../../src/panels/lovelace/cards/hui-card";
import type { HuiCard } from "../../../src/panels/lovelace/cards/hui-card";
import type { HomeAssistant } from "../../../src/types";
import { EmbedElement } from "./embed-element";
import type { ScriptObject } from "./script-data";
import { embedElementStyles } from "./theme-styles";

/**
 * Renders a Lovelace card with the backend of a provider, see `EmbedElement`.
 *
 * The card takes the columns and rows it would take in a section, so cards
 * in an element with `display: grid` and 12 columns lay out like a section.
 * It also sets `--column-size` and `--row-size` on itself.
 */
@customElement("ha-embed-card")
export class HaEmbedCard extends EmbedElement<LovelaceCardConfig> {
  private _card = createRef<HuiCard>();

  // A card names its type
  protected isConfig(data: ScriptObject): data is LovelaceCardConfig {
    return "type" in data && typeof data.type === "string";
  }

  protected renderContent(hass: HomeAssistant) {
    if (!this.config) {
      return undefined;
    }

    return html`<hui-card
      ${ref(this._card)}
      .hass=${hass}
      .config=${this.config}
      .layout=${"grid"}
      @card-updated=${this._updateSize}
      @card-visibility-changed=${this._updateSize}
    ></hui-card>`;
  }

  protected updated() {
    // The card element only exists once hui-card has updated
    this._card.value?.updateComplete.then(() => this._updateSize());
  }

  // The size the card gets in a section, set on the host so that the page can
  // lay out cards in a grid of 12 columns, like a section
  private _updateSize = () => {
    const card = this._card.value;
    if (!card) {
      return;
    }
    const { rows, columns } = computeCardGridSize(card.getGridOptions());
    this.hidden = card.hidden;
    this.toggleAttribute("full-width", columns === "full");
    this.toggleAttribute("fit-rows", typeof rows === "number");
    this.style.setProperty(
      "--column-size",
      typeof columns === "number" ? String(columns) : null
    );
    this.style.setProperty(
      "--row-size",
      typeof rows === "number" ? String(rows) : null
    );
  };

  static styles = [
    embedElementStyles,
    css`
      /* The sizes of a card in a section, see hui-grid-section */
      :host {
        --row-gap: var(--ha-section-grid-row-gap, 8px);
        --row-height: var(--ha-section-grid-row-height, 56px);
        display: block;
        grid-row: span var(--row-size, 1);
        grid-column: span min(var(--column-size, 12), 12);
      }
      :host([full-width]) {
        grid-column: 1 / -1;
      }
      :host([fit-rows]) .theme {
        height: calc(
          (var(--row-size, 1) * (var(--row-height) + var(--row-gap))) - var(
              --row-gap
            )
        );
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-card": HaEmbedCard;
  }
}
