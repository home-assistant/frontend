import { ListItemEl } from "@material/web/list/internal/listitem/list-item";
import { styles } from "@material/web/list/internal/listitem/list-item-styles";
import { css, html, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
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
    a {
      text-decoration: none;
      color: inherit;
      outline: none;
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
    }
    md-item {
      width: 100%;
    }
  `,
];

@customElement("ha-md-list-item")
export class HaMdListItem extends ListItemEl {
  @property({ type: String, attribute: "aria-current" })
  public ariaCurrent?: "page" | "step" | "location" | "date" | "time" | "true" | "false";

  static override styles = haMdListStyles;

  protected override render(): TemplateResult {
    if (this.type === "link" && this.href) {
      const content = html`
        <md-item>
          <div slot="container">
            ${(this as any).renderRipple()}
            ${(this as any).renderFocusRing()}
          </div>
          <slot name="start" slot="start"></slot>
          <slot name="end" slot="end"></slot>
          ${(this as any).renderBody()}
        </md-item>
      `;

      return html`
        <li
          id="item"
          role="listitem"
          class="list-item ${classMap((this as any).getRenderClasses())}"
          tabindex="-1"
        >
          <a
            class="anchor"
            href=${this.href}
            target=${this.target || nothing}
            aria-current=${this.ariaCurrent || nothing}
            tabindex=${this.disabled ? "-1" : "0"}
            ?disabled=${this.disabled}
            @focus=${this.onFocus}
          >
            ${content}
          </a>
        </li>
      `;
    }
    return super.render();
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
