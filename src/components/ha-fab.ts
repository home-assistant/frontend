import { FabBase } from "@material/mwc-fab/mwc-fab-base";
import { styles } from "@material/mwc-fab/mwc-fab.css";
import { customElement } from "lit/decorators";
import { css } from "lit";
import { mainWindow } from "../common/dom/get_main_window";

@customElement("ha-fab")
export class HaFab extends FabBase {
  protected firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
  }

  static override styles = [
    styles,
    css`
      :host {
        --mdc-typography-button-text-transform: none;
        --mdc-typography-button-font-size: var(--ha-font-size-l);
        --mdc-typography-button-font-family: var(--ha-font-family-body);
        --mdc-typography-button-font-weight: var(--ha-font-weight-medium);
        --mdc-theme-secondary: var(--primary-color);
      }
      :host .mdc-fab--extended {
        border-radius: var(
          --ha-button-border-radius,
          var(--ha-border-radius-pill)
        );
      }
      :host .mdc-fab.mdc-fab--extended .ripple {
        border-radius: var(
          --ha-button-border-radius,
          var(--ha-border-radius-pill)
        );
      }
      :host .mdc-fab--extended .mdc-fab__icon {
        margin-inline-start: -8px;
        margin-inline-end: 12px;
        direction: var(--direction);
      }
      :host([disabled]) button {
        cursor: not-allowed !important;
        --mdc-theme-secondary: var(--disabled-color);
        opacity: 0.2;
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
