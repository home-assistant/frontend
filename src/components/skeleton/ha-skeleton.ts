import WaSkeleton from "@home-assistant/webawesome/dist/components/skeleton/skeleton";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html } from "lit";
import { customElement, query } from "lit/decorators";

/**
 * Placeholder shown while content loads. Sized by its container unless a
 * more specific variant such as `ha-skeleton-text` or `ha-skeleton-icon` is used.
 *
 * A soft wave sweeps across it by default. It's one wave across the whole
 * window: each skeleton shows its own slice of it, and all of them run in
 * step, so the wave flows from one skeleton into the next, and a skeleton
 * added later joins mid-sweep instead of starting over.
 *
 * @cssprop --ha-skeleton-color - The fill color. Defaults to `var(--ha-color-fill-neutral-normal-resting)`.
 * @cssprop --ha-skeleton-sheen-color - The sheen color when `effect="sheen"`. Defaults to `var(--ha-color-fill-neutral-normal-hover)`.
 * @cssprop --ha-skeleton-border-radius - The corner radius. Defaults to `var(--ha-border-radius-sm)`.
 * @cssprop --ha-skeleton-duration - How long one sweep across the window and its pause take when `effect="sheen"`. Defaults to `3s`.
 */
@customElement("ha-skeleton")
export class HaSkeleton extends WaSkeleton {
  override effect: WaSkeleton["effect"] = "sheen";

  @query(".wave") private _wave?: HTMLDivElement;

  private _placeFrame?: number;

  private _resizeObserver?: ResizeObserver;

  public connectedCallback() {
    super.connectedCallback();
    this._resizeObserver ??= new ResizeObserver(() => this._placeWave());
    this._resizeObserver.observe(this);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();

    if (this._placeFrame !== undefined) {
      cancelAnimationFrame(this._placeFrame);
      this._placeFrame = undefined;
    }
  }

  public override render() {
    return html`
      <div part="indicator" class="indicator">
        <div class="wave" @animationiteration=${this._placeWave}></div>
      </div>
    `;
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);

    if (changedProperties.has("effect")) {
      this._placeWave();
    }
  }

  /**
   * Line the wave up with the window and with every other skeleton. Its
   * place is read again at the end of each sweep, while it's out of sight,
   * so it follows the skeleton when the layout around it moves.
   */
  private _placeWave() {
    if (this.effect !== "sheen" || this._placeFrame !== undefined) {
      return;
    }

    // Read now, write on the next frame, so many skeletons don't force a
    // layout each
    const { left } = this.getBoundingClientRect();

    this._placeFrame = requestAnimationFrame(() => {
      this._placeFrame = undefined;
      const wave = this._wave;

      if (!wave) {
        return;
      }

      wave.style.left = `${-left}px`;

      // All waves count from the same moment, so they stay in step
      wave.getAnimations().forEach((animation) => {
        if (animation.startTime !== 0) {
          animation.startTime = 0;
        }
      });
    });
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
            var(--ha-color-fill-neutral-normal-hover)
          );
          --wa-border-radius-pill: var(
            --ha-skeleton-border-radius,
            var(--ha-border-radius-sm)
          );
        }
        .wave {
          display: none;
        }
        :host([effect="sheen"]) .indicator {
          position: relative;
          overflow: hidden;
          background: var(--color);
          animation: none;
        }
        /* The wave crosses the whole window, placed from its left edge, and
           moves with transform so it stays cheap */
        :host([effect="sheen"]) .wave {
          display: block;
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 400px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--sheen-color),
            transparent
          );
          transform: translateX(-100%);
          animation: ha-skeleton-sheen var(--ha-skeleton-duration, 3s)
            ease-in-out infinite;
        }
        :host([effect="sheen"]:dir(rtl)) .wave {
          animation-direction: reverse;
        }
        @keyframes ha-skeleton-sheen {
          0% {
            transform: translateX(-100%);
          }
          75%,
          100% {
            transform: translateX(100vw);
          }
        }
        @media (forced-colors: active) {
          :host {
            --color: GrayText;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :host([effect="pulse"]) .indicator,
          :host([effect="sheen"]) .wave {
            animation: none;
          }
          :host([effect="sheen"]) .wave {
            display: none;
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
