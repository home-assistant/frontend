import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";

/**
 * Indeterminate circular progress indicator, exposed to screen readers as a
 * `progressbar`.
 *
 * @cssprop --ha-spinner-size - Diameter of the spinner. Defaults to `48px`.
 * @cssprop --ha-spinner-indicator-color - Color of the moving arc.
 * @cssprop --ha-spinner-divider-color - Color of the track.
 * @cssprop --track-width - Stroke width of the track and arc.
 */
@customElement("ha-spinner")
export class HaSpinner extends LitElement {
  /** Preset diameter. `--ha-spinner-size` overrides it. */
  @property({ reflect: true }) public size?:
    "tiny" | "small" | "medium" | "large";

  /**
   * Accessible name of the progress indicator. Name what is in progress, like
   * "Installing update", rather than its state. Defaults to the translated
   * "Loading".
   */
  @property({ attribute: "accessible-label" })
  public accessibleLabel?: string;

  @state() @consumeLocalize() private _localize?: LocalizeFunc;

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
    const label =
      this.accessibleLabel ||
      this._localize?.("ui.common.loading") ||
      "Loading";

    // aria-hidden on the host alone doesn't keep the label out of a parent's
    // name in Chromium, so it is passed on to the progressbar too.
    return html`
      <svg
        part="base spinner"
        role="progressbar"
        aria-label=${label}
        aria-hidden=${this.getAttribute("aria-hidden") ?? nothing}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle class="track" />
        <circle class="indicator" />
      </svg>
    `;
  }

  static styles = css`
    :host {
      --indicator-color: var(
        --ha-spinner-indicator-color,
        var(--primary-color)
      );
      --track-color: var(--ha-spinner-divider-color, var(--divider-color));
      --track-width: 4px;
      --speed: 3.5s;
      --size: 1em;
      box-sizing: border-box;
      flex: none;
      display: inline-flex;
      width: var(--size);
      height: var(--size);
      font-size: var(--ha-spinner-size, var(--_preset-size, 48px));
    }

    :host([hidden]) {
      display: none;
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
      --radius: calc(var(--size) / 2 - var(--track-width) / 2);
      --circumference: calc(var(--radius) * 2 * 3.141592654);
      cx: calc(var(--size) / 2);
      cy: calc(var(--size) / 2);
      r: var(--radius);
      fill: none;
      stroke-width: var(--track-width);
    }

    .track {
      stroke: var(--track-color);
    }

    .indicator {
      stroke: var(--indicator-color);
      stroke-linecap: round;
      stroke-dasharray:
        calc(0.597 * var(--circumference)), calc(0.796 * var(--circumference));
      stroke-dashoffset: calc(-0.04 * var(--circumference));
      animation: dash 1.5s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      svg,
      .indicator {
        animation: none;
      }
    }

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
          calc(0.008 * var(--circumference)), calc(1.194 * var(--circumference));
        stroke-dashoffset: 0;
      }
      50% {
        stroke-dasharray:
          calc(0.716 * var(--circumference)), calc(1.194 * var(--circumference));
        stroke-dashoffset: calc(-0.278 * var(--circumference));
      }
      100% {
        stroke-dasharray:
          calc(0.716 * var(--circumference)), calc(1.194 * var(--circumference));
        stroke-dashoffset: calc(-0.987 * var(--circumference));
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-spinner": HaSpinner;
  }
}
