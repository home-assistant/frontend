import Tooltip from "@awesome.me/webawesome/dist/components/tooltip/tooltip";
import { css } from "lit";
import type { CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";

import { StateSet } from "../resources/polyfills/stateset";

@customElement("ha-tooltip")
export class HaTooltip extends Tooltip {
  attachInternals() {
    const internals = super.attachInternals();
    Object.defineProperty(internals, "states", {
      value: new StateSet(this, internals.states),
    });
    return internals;
  }

  /** The amount of time to wait before showing the tooltip when the user mouses in. */
  @property({ attribute: "show-delay", type: Number }) showDelay = 150;

  /** The amount of time to wait before hiding the tooltip when the user mouses out.. */
  @property({ attribute: "hide-delay", type: Number }) hideDelay = 400;

  static get styles(): CSSResultGroup {
    return [
      Tooltip.styles,
      css`
        :host {
          --wa-tooltip-background-color: var(--secondary-background-color);
          --wa-tooltip-color: var(--primary-text-color);
          --wa-tooltip-font-family: var(
            --ha-tooltip-font-family,
            var(--ha-font-family-body)
          );
          --wa-tooltip-font-size: var(
            --ha-tooltip-font-size,
            var(--ha-font-size-s)
          );
          --wa-tooltip-font-weight: var(
            --ha-tooltip-font-weight,
            var(--ha-font-weight-normal)
          );
          --wa-tooltip-line-height: var(
            --ha-tooltip-line-height,
            var(--ha-line-height-condensed)
          );
          --wa-tooltip-padding: 8px;
          --wa-tooltip-border-radius: var(--ha-tooltip-border-radius, 4px);
          --wa-tooltip-arrow-size: var(--ha-tooltip-arrow-size, 8px);
          --sl-z-index-tooltip: var(--ha-tooltip-z-index, 1000);
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
