import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { HaSkeleton } from "./ha-skeleton";

/**
 * Placeholder for an icon. Uses the same size as `ha-icon` and `ha-svg-icon`.
 */
@customElement("ha-skeleton-icon")
export class HaSkeletonIcon extends HaSkeleton {
  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        :host {
          display: inline-flex;
          vertical-align: middle;
          flex: none;
          width: var(--mdc-icon-size, 24px);
          height: var(--mdc-icon-size, 24px);
          min-height: 0;
          --ha-skeleton-border-radius: var(--ha-border-radius-circle);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-skeleton-icon": HaSkeletonIcon;
  }
}
