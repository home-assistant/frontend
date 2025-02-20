import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component";
import styles from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.styles";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-tooltip")
export class HaTooltip extends SlTooltip {
  static override styles = [
    styles,
    css`
      :host {
        --sl-tooltip-background-color: var(--secondary-background-color);
        --sl-tooltip-padding: 8px;
        --sl-tooltip-border-radius: 4px;
        --sl-tooltip-arrow-size: 8px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tooltip": HaTooltip;
  }
}
