import { FilterChip } from "@material/web/chips/internal/filter-chip";
import { styles } from "@material/web/chips/internal/filter-styles";
import { styles as selectableStyles } from "@material/web/chips/internal/selectable-styles";
import { styles as sharedStyles } from "@material/web/chips/internal/shared-styles";
import { styles as trailingIconStyles } from "@material/web/chips/internal/trailing-icon-styles";
import { styles as elevatedStyles } from "@material/web/chips/internal/elevated-styles";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-filter-chip")
export class HaFilterChip extends FilterChip {
  @property({ type: Boolean, reflect: true, attribute: "no-leading-icon" })
  noLeadingIcon = false;

  static override styles = [
    sharedStyles,
    elevatedStyles,
    trailingIconStyles,
    selectableStyles,
    styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-sys-color-on-surface-variant: var(--primary-text-color);
        --md-sys-color-on-secondary-container: var(--primary-text-color);
        --md-filter-chip-container-shape: 16px;
        --md-filter-chip-outline-color: var(--outline-color);
        --md-filter-chip-selected-container-color: rgb(
          from var(--primary-text-color) r g b / 0.15
        );
      }
    `,
  ];

  protected renderLeadingIcon() {
    if (this.noLeadingIcon) {
      // eslint-disable-next-line lit/prefer-nothing
      return html``;
    }
    return super.renderLeadingIcon();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-chip": HaFilterChip;
  }
}
