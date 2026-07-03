import SplitPanel from "@home-assistant/webawesome/dist/components/split-panel/split-panel";
import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-split-panel")
export class HaSplitPanel extends SplitPanel {
  static get styles(): CSSResultGroup {
    return [
      SplitPanel.styles,
      css`
        :host {
          --divider-width: var(--ha-split-panel-divider-width, 2px);
          --divider-hit-area: var(--ha-split-panel-divider-hit-area, 12px);
          --min: var(--ha-split-panel-min, 0);
          --max: var(--ha-split-panel-max, 100%);
        }

        .divider {
          background-color: var(--divider-color);
          transition: background-color var(--ha-animation-duration-fast, 150ms)
            ease-out;
        }

        /* Grip affordance so the divider reads as draggable. The divider
           already centers its children via flexbox, so keep this in flow.
           Consumers slotting their own divider handle can hide it with
           --ha-split-panel-grip-display: none. */
        .divider::before {
          content: "";
          width: 2px;
          height: var(--ha-space-8, 32px);
          display: var(--ha-split-panel-grip-display, block);
          border-radius: var(--ha-border-radius-pill, 9999px);
          background-color: var(--secondary-text-color);
          opacity: 0.5;
          transition: opacity var(--ha-animation-duration-fast, 150ms) ease-out;
        }

        /* In vertical orientation the divider is horizontal, so the grip pill
           lies flat instead of standing upright. */
        :host([orientation="vertical"]) .divider::before {
          width: var(--ha-space-8, 32px);
          height: 2px;
        }

        @media (hover: hover) {
          :host(:not([disabled])) .divider:hover {
            background-color: var(--primary-color);
          }
          :host(:not([disabled])) .divider:hover::before {
            opacity: 1;
          }
        }

        :host(:not([disabled])) .divider:focus-visible {
          background-color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-split-panel": HaSplitPanel;
  }
}
