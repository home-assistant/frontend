import { MdFilterChip } from "@material/web/chips/filter-chip";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-filter-chip")
export class HaFilterChip extends MdFilterChip {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-filter-chip-container-shape: 16px;
        --md-filter-chip-outline-color: var(--outline-color);
        --md-filter-chip-selected-container-color: rgba(
          var(--rgb-primary-text-color),
          0.15
        );
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-chip": HaFilterChip;
  }
}
