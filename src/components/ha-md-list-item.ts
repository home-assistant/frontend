import { ListItemEl } from "@material/web/list/internal/listitem/list-item";
import { styles } from "@material/web/list/internal/listitem/list-item-styles";
import { css, html, nothing, type TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "./ha-ripple";

export const haMdListStyles = [
  styles,
  css`
    :host {
      --ha-icon-display: block;
      --md-sys-color-primary: var(--primary-text-color);
      --md-sys-color-secondary: var(--secondary-text-color);
      --md-sys-color-surface: var(--card-background-color);
      --md-sys-color-on-surface: var(--primary-text-color);
      --md-sys-color-on-surface-variant: var(--secondary-text-color);
    }
    md-item {
      overflow: var(--md-item-overflow, hidden);
      align-items: var(--md-item-align-items, center);
      gap: var(--ha-md-list-item-gap, 16px);
    }
  `,
];

@customElement("ha-md-list-item")
export class HaMdListItem extends ListItemEl {
  static override styles = haMdListStyles;

  protected renderRipple(): TemplateResult | typeof nothing {
    if (this.type === "text") {
      return nothing;
    }

    return html`<ha-ripple
      part="ripple"
      for="item"
      ?disabled=${this.disabled && this.type !== "link"}
    ></ha-ripple>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-list-item": HaMdListItem;
  }
}
