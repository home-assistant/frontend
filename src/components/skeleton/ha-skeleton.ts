import WaSkeleton from "@home-assistant/webawesome/dist/components/skeleton/skeleton";
import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement } from "lit/decorators";

/**
 * Placeholder shown while content loads. Sized by its container unless a
 * more specific variant such as `ha-skeleton-text` or `ha-skeleton-icon` is used.
 *
 * @cssprop --ha-skeleton-color - The fill color. defaults to `var(--ha-color-fill-neutral-normal-resting)`.
 * @cssprop --ha-skeleton-sheen-color - The sheen color when `effect="sheen"`. defaults to `var(--ha-color-fill-neutral-loud-resting)`.
 * @cssprop --ha-skeleton-border-radius - The corner radius. defaults to `var(--ha-border-radius-sm)`.
 */
@customElement("ha-skeleton")
export class HaSkeleton extends WaSkeleton {
  constructor() {
    super();
    this.effect = "pulse";
  }

  static get styles(): CSSResultGroup {
    return [
      WaSkeleton.styles,
      css`
        :host {
          --color: var(
            --ha-skeleton-color,
            var(--ha-color-fill-neutral-normal-resting)
          );
          --sheen-color: var(
            --ha-skeleton-sheen-color,
            var(--ha-color-fill-neutral-loud-resting)
          );
          --wa-border-radius-pill: var(
            --ha-skeleton-border-radius,
            var(--ha-border-radius-sm)
          );
        }
        @media (forced-colors: active) {
          :host {
            --color: GrayText;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :host([effect="pulse"]) .indicator,
          :host([effect="sheen"]) .indicator {
            animation: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-skeleton": HaSkeleton;
  }
}
