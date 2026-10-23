import type { LitElement, ReactiveController } from "lit";
import { css, html } from "lit";
import { repeat } from "lit/directives/repeat";

export interface EnergyFlowDot {
  /** Id of the path, in the sibling SVG, that the dot travels along. */
  path: string;
  /** Class that gives the dot its color. */
  className: string;
  /** Seconds per lap. */
  duration: number;
  /** Travel the path from its end to its start. */
  reverse?: boolean;
}

// Keyframes are sampled along the path every STEP_PX on screen: exact on straight
// segments, well under a pixel off on the curves.
const STEP_PX = 2;
// Same footprint as the SVG dots this replaces: r=1 in user units plus a 4px
// non-scaling stroke.
const DOT_STROKE_PX = 4;

/**
 * Renders the dots moving along an SVG's flow paths. Place it right after the
 * `<svg>`, both inside a `.flow` box, and attach an `EnergyFlowDotsController`.
 */
export const renderEnergyFlowDots = (
  dots: (EnergyFlowDot | false | null | undefined | 0)[]
) =>
  html`<div class="flow-dots">
    ${repeat(
      dots.filter((dot): dot is EnergyFlowDot => Boolean(dot)),
      (dot) => `${dot.path}:${dot.className}`,
      (dot) =>
        html`<div
          class="flow-dot ${dot.className}"
          data-path=${dot.path}
          data-duration=${dot.duration}
          data-reverse=${dot.reverse ? "1" : "0"}
        ></div>`
    )}
  </div>`;

interface RunningDot {
  key: string;
  duration: number;
  animation: Animation;
}

/**
 * Animates the dots rendered by `renderEnergyFlowDots` with transform-only Web
 * Animations, which the compositor runs off the main thread. SMIL
 * `<animateMotion>` instead re-lays-out the SVG and repaints on the main thread
 * every frame, which keeps low-end devices busy for as long as the card is
 * shown. Keyframes are rebuilt when a path, its on-screen size or the speed
 * changes, keeping each dot's position along its path.
 */
export class EnergyFlowDotsController implements ReactiveController {
  private _running = new Map<HTMLElement, RunningDot>();

  private _resizeObserver?: ResizeObserver;

  constructor(private _host: LitElement) {
    _host.addController(this);
  }

  public hostConnected() {
    if (this._host.hasUpdated) {
      this._sync();
    }
  }

  public hostUpdated() {
    this._sync();
  }

  public hostDisconnected() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  private _sync = () => {
    for (const [dot, running] of this._running) {
      if (!dot.isConnected) {
        running.animation.cancel();
        this._running.delete(dot);
      }
    }
    const layers =
      this._host.renderRoot.querySelectorAll<HTMLElement>(".flow-dots");
    if (!layers.length) {
      return;
    }
    this._resizeObserver ??= new ResizeObserver(this._sync);
    for (const layer of layers) {
      this._resizeObserver.observe(layer);
      const svg = layer.parentElement?.querySelector("svg");
      if (!svg) {
        continue;
      }
      for (const dot of layer.querySelectorAll<HTMLElement>(".flow-dot")) {
        this._animate(layer, svg, dot);
      }
    }
  };

  private _animate(layer: HTMLElement, svg: SVGSVGElement, dot: HTMLElement) {
    const path = svg.querySelector<SVGGeometryElement>(
      `#${CSS.escape(dot.dataset.path!)}`
    );
    // User space of the path to CSS pixels of the SVG box, which the dot layer
    // covers exactly.
    const ctm = path?.getCTM();
    const scale = ctm ? Math.hypot(ctm.a, ctm.b) : 0;
    if (!path || !ctm || !scale) {
      return;
    }
    layer.style.setProperty(
      "--flow-dot-size",
      `${2 * scale + DOT_STROKE_PX}px`
    );
    const duration = Number(dot.dataset.duration) * 1000;
    const reverse = dot.dataset.reverse === "1";
    const key = [
      path.getAttribute("d"),
      ctm.a,
      ctm.b,
      ctm.c,
      ctm.d,
      ctm.e,
      ctm.f,
      duration,
      reverse,
    ].join();
    const running = this._running.get(dot);
    if (running?.key === key) {
      return;
    }
    const length = path.getTotalLength();
    const steps = Math.max(1, Math.ceil((length * scale) / STEP_PX));
    const keyframes: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const point = path
        .getPointAtLength((length * i) / steps)
        .matrixTransform(ctm);
      keyframes.push({ transform: `translate(${point.x}px, ${point.y}px)` });
    }
    if (reverse) {
      keyframes.reverse();
    }
    const progress = running
      ? (Number(running.animation.currentTime ?? 0) % running.duration) /
        running.duration
      : 0;
    running?.animation.cancel();
    const animation = dot.animate(keyframes, {
      duration,
      iterations: Infinity,
    });
    animation.currentTime = progress * duration;
    this._running.set(dot, { key, duration, animation });
  }
}

export const energyFlowDotsStyles = css`
  .flow {
    position: relative;
  }
  .flow > svg {
    display: block;
  }
  .flow-dots {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .flow-dot {
    position: absolute;
    top: 0;
    left: 0;
    width: var(--flow-dot-size);
    height: var(--flow-dot-size);
    margin: calc(var(--flow-dot-size) / -2) 0 0 calc(var(--flow-dot-size) / -2);
    border-radius: var(--ha-border-radius-circle);
    will-change: transform;
  }
`;
