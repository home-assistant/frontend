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
 * @cssprop --ha-progress-bar-indicator-background - Background of the filled progress indicator. Overrides `--ha-progress-bar-indicator-color` when set (accepts any CSS background value, e.g. gradients).
 * @cssprop --ha-progress-bar-track-color - Color of the progress track.
 * @cssprop --ha-progress-bar-track-height - Height of the progress track. Defaults to `16px`.
 * @cssprop --ha-progress-bar-border-radius - Border radius of the progress bar. Defaults to `var(--ha-border-radius-pill)`.
 * @cssprop --ha-progress-bar-animation-duration - Animation duration for indeterminate/loading highlight. Defaults to `2.5s`.
 * @cssprop --ha-progress-bar-indicator-highlight-image - Image shown at the progress indicator tip (accepts any CSS `background-image` value). Hidden during indeterminate state.
 * @cssprop --ha-progress-bar-indicator-highlight-width - Width of the indicator highlight element. Defaults to `calc(var(--track-height) * 2)`.
 * @cssprop --ha-progress-bar-indicator-highlight-height - Height of the indicator highlight element. Defaults to `calc(var(--track-height) * 2)`.
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
          position: relative;
        }
        .progress-bar {
          border-radius: var(
            --ha-progress-bar-border-radius,
            var(--ha-border-radius-pill)
          );
        }
        .indicator {
          background: var(
            --ha-progress-bar-indicator-background,
            var(--indicator-color)
          );
        }
        :host([indeterminate]) .indicator {
          animation: wa-progress-indeterminate
            var(--ha-progress-bar-animation-duration, 2.5s) infinite
            cubic-bezier(0.37, 0, 0.63, 1);
        }
        @keyframes slide-highlight {
          0% {
            transform: translateX(-200%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        :host([loading]:not([indeterminate])) .progress-bar::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            oklch(from var(--indicator-color) 85% c h) 50%,
            transparent 100%
          );
          opacity: 0.5;
          animation: slide-highlight
            var(--ha-progress-bar-animation-duration, 2.5s) infinite
            cubic-bezier(0.37, 0, 0.63, 1);
          width: 50%;
        }
        :host::after {
          --width: var(
            --ha-progress-bar-indicator-highlight-width,
            calc(var(--track-height) * 2)
          );
          width: var(--width);
          height: var(
            --ha-progress-bar-indicator-highlight-height,
            calc(var(--track-height) * 2)
          );
          content: "";
          position: absolute;
          inset-inline-start: clamp(
            var(--width) / 2,
            var(--percentage, 0%),
            calc(100% - var(--width) / 2)
          );
          top: 50%;
          transform: translate(-50%, -50%);
          background-image: var(--ha-progress-bar-indicator-highlight-image);
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          pointer-events: none;
          transition: inset-inline-start var(--wa-transition-slow, 200ms)
            var(--wa-transition-easing, ease);
        }
        :host([indeterminate])::after {
          display: none;
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
