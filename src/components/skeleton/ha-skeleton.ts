import WaSkeleton from "@home-assistant/webawesome/dist/components/skeleton/skeleton";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html } from "lit";
import { customElement, query } from "lit/decorators";

/**
 * Placeholder shown while content loads. Sized by its container unless a
 * more specific variant such as `ha-skeleton-text` or `ha-skeleton-icon` is used.
 *
 * A soft wave sweeps across it by default. It's one wave across all the
 * skeletons on the page, from the leftmost to the rightmost: each skeleton
 * shows its own slice of it, and all of them run in step, so the wave flows
 * from one skeleton into the next, and a skeleton added later joins
 * mid-sweep instead of starting over. Each sweep starts as the last one
 * leaves the content.
 *
 * @cssprop --ha-skeleton-color - The fill color. Defaults to `var(--ha-color-fill-neutral-normal-resting)`.
 * @cssprop --ha-skeleton-sheen-color - The sheen color when `effect="sheen"`. Defaults to `var(--ha-color-fill-neutral-normal-hover)`.
 * @cssprop --ha-skeleton-border-radius - The corner radius. Defaults to `var(--ha-border-radius-sm)`.
 * @cssprop --ha-skeleton-duration - How long one sweep across the skeletons takes when `effect="sheen"`. Defaults to `3s`.
 */
@customElement("ha-skeleton")
export class HaSkeleton extends WaSkeleton {
  override effect: WaSkeleton["effect"] = "sheen";

  /* Every skeleton showing the wave, which share one track */
  private static _waving = new Set<HaSkeleton>();

  private static _trackFrame?: number;

  @query(".wave") private _wave?: HTMLDivElement;

  private _resizeObserver?: ResizeObserver;

  /**
   * Lay the one track the wave runs along over the content: from the left
   * edge of the leftmost skeleton to the right edge of the rightmost, so no
   * time goes on empty space around them. It's measured again whenever a
   * skeleton comes, goes or changes size, and at the end of each sweep, so
   * it follows the layout as it moves.
   */
  private static _scheduleTrack() {
    if (HaSkeleton._trackFrame !== undefined) {
      return;
    }

    HaSkeleton._trackFrame = requestAnimationFrame(() => {
      HaSkeleton._trackFrame = undefined;

      // Read every skeleton before writing any, so layout runs once
      const boxes = [...HaSkeleton._waving].flatMap((skeleton) => {
        const rect = skeleton.getBoundingClientRect();

        return rect.width > 0 ? [{ skeleton, rect }] : [];
      });

      if (boxes.length === 0) {
        return;
      }

      const left = Math.min(...boxes.map(({ rect }) => rect.left));
      const right = Math.max(...boxes.map(({ rect }) => rect.right));

      boxes.forEach(({ skeleton, rect }) =>
        skeleton._placeWave(left - rect.left, right - left)
      );
    });
  }

  public connectedCallback() {
    super.connectedCallback();
    this._resizeObserver ??= new ResizeObserver(() =>
      HaSkeleton._scheduleTrack()
    );
    this._resizeObserver.observe(this);

    if (this.effect === "sheen") {
      HaSkeleton._waving.add(this);
      HaSkeleton._scheduleTrack();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    HaSkeleton._waving.delete(this);
    HaSkeleton._scheduleTrack();
  }

  public override render() {
    return html`
      <div part="indicator" class="indicator">
        <div
          class="wave"
          @animationiteration=${HaSkeleton._scheduleTrack}
        ></div>
      </div>
    `;
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);

    if (changedProperties.has("effect")) {
      if (this.effect === "sheen") {
        HaSkeleton._waving.add(this);
      } else {
        HaSkeleton._waving.delete(this);
      }

      HaSkeleton._scheduleTrack();
    }
  }

  /* Put this skeleton's slice of the wave in its place on the track */
  private _placeWave(trackStart: number, trackWidth: number) {
    const wave = this._wave;

    if (!wave) {
      return;
    }

    wave.style.left = `${trackStart}px`;
    wave.style.setProperty("--ha-skeleton-track-width", `${trackWidth}px`);

    // All waves count from the same moment, so they stay in step
    wave.getAnimations().forEach((animation) => {
      if (animation.startTime !== 0) {
        animation.startTime = 0;
      }
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
        /* The wave crosses the track over all the skeletons, placed from its
           start, and moves with transform so it stays cheap */
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
          /* An even pace with no hold, so the next sweep enters as soon as
             the last one leaves */
          animation: ha-skeleton-sheen var(--ha-skeleton-duration, 3s) linear
            infinite;
        }
        :host([effect="sheen"]:dir(rtl)) .wave {
          animation-direction: reverse;
        }
        @keyframes ha-skeleton-sheen {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(var(--ha-skeleton-track-width, 100vw));
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
