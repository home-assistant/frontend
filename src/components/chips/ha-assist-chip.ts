import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { HaChipBase } from "./ha-chip-base";

@customElement("ha-assist-chip")
export class HaAssistChip extends HaChipBase {
  @property({ type: Boolean, reflect: true }) filled = false;

  @property({ type: Boolean, reflect: true }) active = false;

  @property({ type: Boolean, reflect: true }) elevated = false;

  static override get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        :host {
          --ha-chip-label-color: var(
            --md-assist-chip-label-text-color,
            var(--md-sys-color-on-surface, var(--primary-text-color))
          );
          --ha-button-border-radius: var(
            --ha-assist-chip-container-shape,
            16px
          );
          --ha-chip-container-color: var(
            --ha-assist-chip-container-color,
            transparent
          );
          --ha-chip-container-opacity: var(
            --ha-assist-chip-container-opacity,
            1
          );
          --ha-chip-outline-color: var(
            --md-assist-chip-outline-color,
            var(--outline-color)
          );
          --ha-chip-icon-label-space: var(
            --md-assist-chip-icon-label-space,
            var(--ha-space-2)
          );
        }
        :host([filled]) {
          --ha-chip-container-color: var(
            --ha-assist-chip-filled-container-color
          );
          --ha-chip-outline-color: transparent;
        }
        :host([active]) {
          --ha-chip-container-color: var(
            --ha-assist-chip-active-container-color
          );
          --ha-chip-container-opacity: var(
            --ha-assist-chip-active-container-opacity,
            1
          );
        }
        .primary {
          padding-inline-end: var(
            --md-assist-chip-trailing-space,
            var(--ha-space-4)
          );
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-assist-chip": HaAssistChip;
  }
}
