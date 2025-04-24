import { FilledSelect } from "@material/web/select/internal/filled-select";
import { styles as sharedStyles } from "@material/web/select/internal/shared-styles";
import { styles } from "@material/web/select/internal/filled-select-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-md-select")
export class HaMdSelect extends FilledSelect {
  static override styles = [
    sharedStyles,
    styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-secondary: var(--secondary-text-color);
        --md-sys-color-surface: var(--card-background-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);

        --md-sys-color-surface-container-highest: var(--input-fill-color);
        --md-sys-color-on-surface: var(--input-ink-color);

        --md-sys-color-surface-container: var(--input-fill-color);
        --md-sys-color-on-secondary-container: var(--primary-text-color);
        --md-sys-color-secondary-container: var(--input-fill-color);
        --md-menu-container-color: var(--card-background-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-select": HaMdSelect;
  }
}
