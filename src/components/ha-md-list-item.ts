import { ListItemEl } from "@material/web/list/internal/listitem/list-item";
import { styles } from "@material/web/list/internal/listitem/list-item-styles";
import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
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

  protected override updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    // Fix accessibility: Remove list semantics for interactive elements
    // so that native link/button roles are properly announced by screen readers
    if (changedProps.has("type") || changedProps.has("href")) {
      const itemElement = this.renderRoot.querySelector("#item");
      if (itemElement) {
        if (this.type === "link" || this.type === "button") {
          // Use "none" role to remove list semantics and let the native
          // <a> or <button> element provide proper accessibility
          itemElement.setAttribute("role", "none");
        } else {
          // Keep listitem role for non-interactive text items
          itemElement.setAttribute("role", "listitem");
        }
      }
    }
  }

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
