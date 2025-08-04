import { FabBase } from "@material/mwc-fab/mwc-fab-base";
import { styles } from "@material/mwc-fab/mwc-fab.css";
import { customElement } from "lit/decorators";
import { css } from "lit";
import { mainWindow } from "../common/dom/get_main_window";

@customElement("ha-fab")
export class HaFab extends FabBase {
  protected firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this.style.setProperty("--mdc-theme-secondary", "var(--primary-color)");
  }

  static override styles = [
    styles,
    css`
      :host {
        --mdc-typography-button-text-transform: none;
        --mdc-typography-button-font-size: var(--ha-font-size-l);
        --mdc-typography-button-font-family: var(--ha-font-family-body);
        --mdc-typography-button-font-weight: var(--ha-font-weight-medium);
      }
      :host .mdc-fab--extended {
        border-radius: var(--ha-button-border-radius, var(--border-radius-pill));
      }
      :host .mdc-fab.mdc-fab--extended .ripple {
        border-radius: var(--ha-button-border-radius, var(--border-radius-pill));
      }
      :host .mdc-fab--extended .mdc-fab__icon {
        margin-inline-start: -8px;
        margin-inline-end: 12px;
        direction: var(--direction);
      }
      :disabled {
        --mdc-theme-secondary: var(--disabled-text-color);
        pointer-events: none;
      }
    `,
    // safari workaround - must be explicit
    mainWindow.document.dir === "rtl"
      ? css`
          :host .mdc-fab--extended .mdc-fab__icon {
            direction: rtl;
          }
        `
      : css``,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fab": HaFab;
  }
}
