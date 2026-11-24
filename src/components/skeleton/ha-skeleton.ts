import WaSkeleton from "@home-assistant/webawesome/dist/components/skeleton/skeleton";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html } from "lit";
import { customElement, query } from "lit/decorators";

/* How far the wave leans from upright, so it starts at the top corner of the
   content and finishes at the opposite bottom corner */
const WAVE_SLANT_DEG = 20;

const WAVE_SLANT = Math.tan((WAVE_SLANT_DEG * Math.PI) / 180);

/* Older browsers don't know :dir(), so they don't mirror the wave either and
   it's placed left to right there */
const DIR_SELECTOR_SUPPORTED = (() => {
  try {
    document.documentElement.matches(":dir(rtl)");

    return true;
  } catch {
    return false;
  }
})();

/**
 * Placeholder shown while content loads. Sized by its container unless a
 * more specific variant such as `ha-skeleton-text` or `ha-skeleton-icon` is used.
 *
 * A soft wave sweeps across it by default. It's one slanted wave across all
 * the skeletons on the page, from the top corner of the content on the side
 * text starts from to the opposite bottom corner: each skeleton shows its
 * own slice of it, and all of them run in step, so the wave flows from one
 * skeleton into the next, and a skeleton added later joins mid-sweep instead
 * of starting over. Each sweep starts as the last one leaves the content.
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

  @query(".indicator") private _indicator?: HTMLDivElement;

  @query(".wave") private _wave?: HTMLDivElement;

  private _resizeObserver?: ResizeObserver;

  /**
   * Lay the one track the wave runs along over the content: the box around
   * all the skeletons, so no time goes on empty space around them. The wave
   * leans, so it enters at the box's top corner and has to travel further,
   * by the box's height times the slant, to clear the opposite bottom
   * corner. It's measured again whenever a skeleton comes, goes or changes
   * size, and at the end of each sweep, so it follows the layout as it moves.
   */
  private static _scheduleTrack() {
    if (HaSkeleton._trackFrame !== undefined) {
      return;
    }

    HaSkeleton._trackFrame = requestAnimationFrame(() => {
      HaSkeleton._trackFrame = undefined;

      // Read every skeleton before writing any, so layout runs once
      const boxes = [...HaSkeleton._waving].flatMap((skeleton) => {
        // The wave sits in the indicator, which can be smaller than the
        // host, such as a text skeleton's bar in the middle of its line
        const rect = (skeleton._indicator ?? skeleton).getBoundingClientRect();
        // A hidden skeleton, such as a picker's once it has loaded, stays
        // out of the box so it doesn't stretch the track
        const shown = getComputedStyle(skeleton).visibility === "visible";
        // The same check the mirroring uses, so a left-to-right cell on a
        // right-to-left page is placed the way it's drawn
        const rtl = DIR_SELECTOR_SUPPORTED && skeleton.matches(":dir(rtl)");

        return rect.width > 0 && shown ? [{ skeleton, rect, rtl }] : [];
      });

      if (boxes.length === 0) {
        return;
      }

      const left = Math.min(...boxes.map(({ rect }) => rect.left));
      const right = Math.max(...boxes.map(({ rect }) => rect.right));
      const top = Math.min(...boxes.map(({ rect }) => rect.top));
      const bottom = Math.max(...boxes.map(({ rect }) => rect.bottom));
      const trackLength = right - left + (bottom - top) * WAVE_SLANT;

      boxes.forEach(({ skeleton, rect, rtl }) => {
        // Right to left, the wave is drawn mirrored, so it's placed from the
        // right edge instead
        const start = rtl ? rect.right - right : left - rect.left;

        // Lower down, the slanted wave arrives later
        skeleton._placeWave(start - (rect.top - top) * WAVE_SLANT, trackLength);
      });
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
      // An update can finish after the skeleton has gone, and it only
      // rejoins when it's connected again
      if (this.effect === "sheen" && this.isConnected) {
        HaSkeleton._waving.add(this);
      } else {
        HaSkeleton._waving.delete(this);
      }

      HaSkeleton._scheduleTrack();
    }
  }

  /* Put this skeleton's slice of the wave in its place on the track */
  private _placeWave(trackStart: number, trackLength: number) {
    const wave = this._wave;

    if (!wave) {
      return;
    }

    wave.style.left = `${trackStart}px`;
    wave.style.setProperty("--ha-skeleton-track-width", `${trackLength}px`);
    wave.style.setProperty("--ha-skeleton-slant", `${-WAVE_SLANT_DEG}deg`);

    // All waves count from the same moment, so they stay in step
    wave.getAnimations?.().forEach((animation) => {
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
        /* Right to left, the wave is drawn mirrored, so it starts from the
           top right corner */
        :host([effect="sheen"]:dir(rtl)) .indicator {
          transform: scaleX(-1);
        }
        /* The wave crosses the track over all the skeletons, placed from its
           start and leaning back from its top edge, and moves with transform
           so it stays cheap */
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
          transform-origin: top left;
          transform: translateX(-100%) skewX(var(--ha-skeleton-slant, 0deg));
          /* An even pace with no hold, so the next sweep enters as soon as
             the last one leaves */
          animation: ha-skeleton-sheen var(--ha-skeleton-duration, 3s) linear
            infinite;
        }
        @keyframes ha-skeleton-sheen {
          from {
            transform: translateX(-100%) skewX(var(--ha-skeleton-slant, 0deg));
          }
          to {
            transform: translateX(var(--ha-skeleton-track-width, 100vw))
              skewX(var(--ha-skeleton-slant, 0deg));
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
