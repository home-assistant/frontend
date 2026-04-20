import Tooltip from "@home-assistant/webawesome/dist/components/tooltip/tooltip";
import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-tooltip")
export class HaTooltip extends Tooltip {
  /** The amount of time to wait before showing the tooltip when the user mouses in. */
  @property({ attribute: "show-delay", type: Number }) showDelay = 350;

  /** The amount of time to wait before hiding the tooltip when the user mouses out.. */
  @property({ attribute: "hide-delay", type: Number }) hideDelay = 150;

  static get styles(): CSSResultGroup {
    return [
      Tooltip.styles,
      css`
        :host {
          --wa-tooltip-background-color: var(
            --ha-tooltip-background-color,
            var(--card-background-color)
          );
          --wa-tooltip-content-color: var(
            --ha-tooltip-text-color,
            var(--primary-text-color)
          );
          --wa-tooltip-font-family: var(
            --ha-tooltip-font-family,
            var(--ha-font-family-body)
          );
          --wa-tooltip-font-size: var(
            --ha-tooltip-font-size,
            var(--ha-font-size-m)
          );
          --wa-tooltip-font-weight: var(
            --ha-tooltip-font-weight,
            var(--ha-font-weight-medium)
          );
          --wa-tooltip-line-height: var(
            --ha-tooltip-line-height,
            var(--ha-line-height-condensed)
          );
          --wa-tooltip-padding: var(--ha-tooltip-padding, var(--ha-space-2));
          --wa-tooltip-border-radius: var(
            --ha-tooltip-border-radius,
            var(--ha-border-radius-md)
          );
          --wa-tooltip-arrow-size: var(--ha-tooltip-arrow-size, 0px);
          --wa-tooltip-border-width: 0px;
          --wa-z-index-tooltip: 1000;
        }

        .tooltip::part(popup) {
          animation-duration: var(--ha-tooltip-animation-duration, 0);
        }

        .body {
          box-shadow: var(--ha-tooltip-box-shadow, var(--ha-box-shadow-m));
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tooltip": HaTooltip;
  }
}
