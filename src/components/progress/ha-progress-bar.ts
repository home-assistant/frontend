import ProgressBar from "@home-assistant/webawesome/dist/components/progress-bar/progress-bar";
import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

/**
 * Home Assistant progress bar component
 *
 * @element ha-progress-bar
 * @extends {ProgressBar}
 *
 * @summary
 * A stylable progress bar component based on webawesome progress bar.
 * Supports regular, indeterminate, and loading states with Home Assistant theming.
 *
 * @cssprop --ha-progress-bar-indicator-color - Color of the filled progress indicator.
 * @cssprop --ha-progress-bar-track-color - Color of the progress track.
 * @cssprop --ha-progress-bar-track-height - Height of the progress track. Defaults to `16px`.
 * @cssprop --ha-progress-bar-border-radius - Border radius of the progress bar. Defaults to `var(--ha-border-radius-pill)`.
 * @cssprop --ha-progress-bar-animation-duration - Animation duration for indeterminate/loading highlight. Defaults to `2.5s`.
 *
 * @attr {boolean} loading - Shows the loading highlight animation on top of the indicator.
 * @attr {boolean} indeterminate - Shows indeterminate progress animation (inherited from ProgressBar).
 */
@customElement("ha-progress-bar")
export class HaProgressBar extends ProgressBar {
  @property({ type: Boolean, reflect: true })
  loading = false;

  static get styles(): CSSResultGroup {
    return [
      ProgressBar.styles,
      css`
        :host {
          --indicator-color: var(
            --ha-progress-bar-indicator-color,
            var(--ha-color-on-primary-normal)
          );
          --track-color: var(
            --ha-progress-bar-track-color,
            var(--ha-color-fill-neutral-normal-hover)
          );
          --track-height: var(--ha-progress-bar-track-height, 16px);
          --wa-transition-slow: var(--ha-animation-duration-slow);
        }
        .progress-bar {
          border-radius: var(
            --ha-progress-bar-border-radius,
            var(--ha-border-radius-pill)
          );
        }
        @keyframes slide-highlight {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        :host([indeterminate]) .indicator {
          animation: wa-progress-indeterminate
            var(--ha-progress-bar-animation-duration, 2.5s) infinite
            cubic-bezier(0.37, 0, 0.63, 1);
        }
        :host([indeterminate]) .indicator::after,
        :host([loading]) .indicator::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--ha-color-fill-primary-normal-hover) 45%,
            var(--ha-color-fill-primary-normal-active) 50%,
            var(--ha-color-fill-primary-normal-hover) 55%,
            transparent 100%
          );
          opacity: 0.4;
          animation: slide-highlight
            var(--ha-progress-bar-animation-duration, 2.5s) infinite
            cubic-bezier(0.37, 0, 0.63, 1);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-progress-bar": HaProgressBar;
  }
}
