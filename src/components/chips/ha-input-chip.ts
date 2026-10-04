import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { HaChipBase } from "./ha-chip-base";

@customElement("ha-input-chip")
export class HaInputChip extends HaChipBase {
  @property({ type: Boolean, reflect: true }) selected = false;

  @property({ type: Boolean, reflect: true }) avatar = false;

  override removable = true;

  static override get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        :host {
          --ha-button-border-radius: 16px;
          --ha-chip-icon-size: var(--md-input-chip-icon-size, 18px);
        }
        :host([selected]) {
          --ha-chip-container-color: var(
            --md-input-chip-selected-container-color,
            rgba(var(--rgb-primary-text-color), 0.15)
          );
          --ha-chip-outline-width: var(
            --md-input-chip-selected-outline-width,
            0px
          );
          --ha-chip-container-opacity: var(
            --ha-input-chip-selected-container-opacity,
            1
          );
        }
        :host([avatar]) ::slotted([slot="icon"]) {
          width: 24px;
          height: 24px;
          border-radius: var(--ha-border-radius-circle);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-chip": HaInputChip;
  }
}
