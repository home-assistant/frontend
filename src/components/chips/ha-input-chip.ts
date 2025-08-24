import { InputChip } from "@material/web/chips/internal/input-chip";
import { styles } from "@material/web/chips/internal/input-styles";
import { styles as selectableStyles } from "@material/web/chips/internal/selectable-styles";
import { styles as sharedStyles } from "@material/web/chips/internal/shared-styles";
import { styles as trailingIconStyles } from "@material/web/chips/internal/trailing-icon-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-input-chip")
export class HaInputChip extends InputChip {
  static override styles = [
    sharedStyles,
    trailingIconStyles,
    selectableStyles,
    styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-sys-color-on-surface-variant: var(--primary-text-color);
        --md-sys-color-on-secondary-container: var(--primary-text-color);
        --md-input-chip-container-shape: 16px;
        --md-input-chip-outline-color: var(--outline-color);
        --md-input-chip-selected-container-color: rgb(
          from var(--primary-text-color) r g b / 0.15
        );
        --ha-input-chip-selected-container-opacity: 1;
        --md-input-chip-label-text-font: Roboto, sans-serif;
      }
      /** Set the size of mdc icons **/
      ::slotted([slot="icon"]) {
        display: flex;
        --mdc-icon-size: var(--md-input-chip-icon-size, 18px);
      }
      .selected::before {
        opacity: var(--ha-input-chip-selected-container-opacity);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-chip": HaInputChip;
  }
}
