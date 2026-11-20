import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { HaSkeleton } from "./ha-skeleton";

/**
 * Placeholder for a line of text, matching the tile secondary text skeleton.
 * It takes the height of the surrounding line, so swapping it for the text
 * doesn't move anything, and draws a thinner bar in the middle of it. Set
 * `width` in CSS to fit the expected text.
 *
 * @cssprop --ha-skeleton-text-width - The width of the placeholder. Defaults to `140px`.
 */
@customElement("ha-skeleton-text")
export class HaSkeletonText extends HaSkeleton {
  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        :host {
          display: inline-flex;
          vertical-align: middle;
          align-items: center;
          width: var(--ha-skeleton-text-width, 140px);
          max-width: 100%;
          height: 1.2em;
          height: 1lh;
          min-height: 0;
        }
        .indicator {
          height: 0.75em;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-skeleton-text": HaSkeletonText;
  }
}
