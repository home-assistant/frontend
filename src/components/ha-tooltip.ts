import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component";
import styles from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.styles";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { setDefaultAnimation } from "@shoelace-style/shoelace/dist/utilities/animation-registry";

setDefaultAnimation("tooltip.show", {
  keyframes: [{ opacity: 0 }, { opacity: 1 }],
  options: { duration: 150, easing: "ease" },
});

setDefaultAnimation("tooltip.hide", {
  keyframes: [{ opacity: 1 }, { opacity: 0 }],
  options: { duration: 400, easing: "ease" },
});

@customElement("ha-tooltip")
export class HaTooltip extends SlTooltip {
  static override styles = [
    styles,
    css`
      :host {
        --sl-tooltip-background-color: var(--secondary-background-color);
        --sl-tooltip-color: var(--primary-text-color);
        --sl-tooltip-font-family: var(
          --ha-tooltip-font-family,
          var(--ha-font-family-body)
        );
        --sl-tooltip-font-size: var(
          --ha-tooltip-font-size,
          var(--ha-font-size-s)
        );
        --sl-tooltip-font-weight: var(
          --ha-tooltip-font-weight,
          var(--ha-font-weight-normal)
        );
        --sl-tooltip-line-height: var(
          --ha-tooltip-line-height,
          var(--ha-line-height-condensed)
        );
        --sl-tooltip-padding: 8px;
        --sl-tooltip-border-radius: var(--ha-tooltip-border-radius, 4px);
        --sl-tooltip-arrow-size: var(--ha-tooltip-arrow-size, 8px);
        --sl-z-index-tooltip: var(--ha-tooltip-z-index, 1000);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tooltip": HaTooltip;
  }
}
