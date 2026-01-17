import { List } from "@material/web/list/internal/list";
import { styles } from "@material/web/list/internal/list-styles";
import type { PropertyValues } from "lit";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-md-list")
export class HaMdList extends List {
  static override styles = [
    styles,
    css`
      :host {
        --md-sys-color-surface: var(--card-background-color);
      }
    `,
  ];

  protected override willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    // Override the default "list" role if a custom role attribute is provided
    const roleAttr = this.getAttribute("role");
    if (roleAttr) {
      (this as any).internals.role = roleAttr;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-list": HaMdList;
  }
}
