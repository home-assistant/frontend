import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

/**
 * @element hac-spinner
 *
 * @summary
 * Circular progress indicator for a task of unknown duration. Exposed to
 * assistive technology as an indeterminate `progressbar`.
 *
 * Set `aria-hidden="true"` when the spinner only decorates text that already
 * says what is in progress. It is passed on to the progressbar, because in
 * Chromium the host's `aria-hidden` alone doesn't keep the label out of a
 * parent's name.
 *
 * @csspart spinner - The `svg` element.
 *
 * @cssprop --hac-spinner-size - Diameter of the spinner. Overrides `size`.
 * @cssprop --hac-spinner-indicator-color - Color of the moving arc.
 * @cssprop --hac-spinner-track-color - Color of the track.
 * @cssprop --hac-spinner-track-width - Stroke width of the track and arc.
 */
export class HacSpinner extends LitElement {
  /** Preset diameter: 16, 28, 48 or 68 pixels. Defaults to 48 pixels. */
  @property({ reflect: true }) public size?:
    "tiny" | "small" | "medium" | "large";

  /**
   * Accessible name. Name what is in progress, like "Installing update",
   * rather than its state. Defaults to "Loading".
   */
  @property({ attribute: "accessible-label" })
  public accessibleLabel?: string;

  /** Name used without `accessibleLabel`. Subclasses can translate it. */
  protected defaultLabel(): string {
    return "Loading";
  }

  static get observedAttributes() {
    return [...super.observedAttributes, "aria-hidden"];
  }

  public attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ) {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === "aria-hidden") {
      this.requestUpdate();
    }
  }

  protected render() {
    return html`
      <svg
        part="spinner"
        role="progressbar"
        aria-label=${this.accessibleLabel || this.defaultLabel()}
        aria-hidden=${this.getAttribute("aria-hidden") ?? nothing}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle class="track" />
        <circle class="indicator" />
      </svg>
    `;
  }

  /*
   * Fallback order: --hac-spinner-*, then the variables of ha-spinner
   * (--ha-spinner-*, --primary-color, --divider-color) so existing themes and
   * callers keep working, then the semantic tokens and their light values for
   * use outside Home Assistant. A size preset wins over --ha-spinner-size, as
   * it did in ha-spinner.
   *
   * --indicator-color, --track-color, --track-width and --speed are the
   * variables ha-spinner inherited from wa-spinner. They are set on the host
   * like they were there, so a rule on the element still overrides them but a
   * value from an ancestor doesn't leak in.
   *
   * The ha-spinner and wa-spinner variables are temporary, see "Theming" in
   * the README.
   */
  static styles = css`
    :host {
      --indicator-color: var(
        --ha-spinner-indicator-color,
        var(--primary-color, var(--ha-color-fill-primary-loud-resting, #009ac7))
      );
      --track-color: var(
        --ha-spinner-divider-color,
        var(--divider-color, var(--ha-color-border-neutral-quiet, #e6e6e6))
      );
      --track-width: 4px;
      --speed: 3.5s;
      --_size: var(
        --hac-spinner-size,
        var(--_preset-size, var(--ha-spinner-size, 48px))
      );
      box-sizing: border-box;
      flex: none;
      display: inline-flex;
      width: var(--_size);
      height: var(--_size);
    }

    :host([hidden]) {
      display: none !important;
    }

    :host([size="tiny"]) {
      --_preset-size: 16px;
    }

    :host([size="small"]) {
      --_preset-size: 28px;
    }

    :host([size="medium"]) {
      --_preset-size: 48px;
    }

    :host([size="large"]) {
      --_preset-size: 68px;
    }

    svg {
      width: 100%;
      height: 100%;
      aspect-ratio: 1;
      animation: spin var(--speed) linear infinite;
    }

    .track,
    .indicator {
      --_width: var(--hac-spinner-track-width, var(--track-width));
      --_radius: calc(var(--_size) / 2 - var(--_width) / 2);
      --_circumference: calc(var(--_radius) * 2 * 3.141592654);
      cx: calc(var(--_size) / 2);
      cy: calc(var(--_size) / 2);
      r: var(--_radius);
      fill: none;
      stroke-width: var(--_width);
    }

    .track {
      stroke: var(--hac-spinner-track-color, var(--track-color));
    }

    .indicator {
      stroke: var(--hac-spinner-indicator-color, var(--indicator-color));
      stroke-linecap: round;
      stroke-dasharray:
        calc(0.597 * var(--_circumference)), calc(0.796 * var(--_circumference));
      stroke-dashoffset: calc(-0.04 * var(--_circumference));
      animation: dash 1.5s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      svg,
      .indicator {
        animation: none;
      }
    }

    /* Keep the track and the arc apart in forced colors mode */
    @media (forced-colors: active) {
      svg {
        forced-color-adjust: none;
      }
      .track {
        stroke: GrayText;
      }
      .indicator {
        stroke: CanvasText;
      }
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    @keyframes dash {
      0% {
        stroke-dasharray:
          calc(0.008 * var(--_circumference)),
          calc(1.194 * var(--_circumference));
        stroke-dashoffset: 0;
      }
      50% {
        stroke-dasharray:
          calc(0.716 * var(--_circumference)),
          calc(1.194 * var(--_circumference));
        stroke-dashoffset: calc(-0.278 * var(--_circumference));
      }
      100% {
        stroke-dasharray:
          calc(0.716 * var(--_circumference)),
          calc(1.194 * var(--_circumference));
        stroke-dashoffset: calc(-0.987 * var(--_circumference));
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hac-spinner": HacSpinner;
  }
}
