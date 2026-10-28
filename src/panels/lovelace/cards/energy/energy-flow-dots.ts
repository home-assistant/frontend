import type { LitElement, ReactiveController } from "lit";
import { css, html } from "lit";
import { repeat } from "lit/directives/repeat";

export interface EnergyFlowDot {
  path: string;
  className: string;
  duration: number;
  reverse?: boolean;
}

const STEP_PX = 2;
// Same footprint as the SVG dots: r=1 in user units plus a 4px non-scaling stroke
const DOT_STROKE_PX = 4;

// Place right after the flow's <svg>, both inside a `.flow` box
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
  keyframes: Keyframe[];
  animation: Animation;
}

const samplePath = (
  path: SVGGeometryElement,
  ctm: DOMMatrix,
  scale: number
): Keyframe[] => {
  const length = path.getTotalLength();
  const steps = Math.max(1, Math.ceil((length * scale) / STEP_PX));
  const keyframes: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const point = path
      .getPointAtLength((length * i) / steps)
      .matrixTransform(ctm);
    keyframes.push({ transform: `translate(${point.x}px, ${point.y}px)` });
  }
  return keyframes;
};

// SMIL <animateMotion> lays out and repaints on the main thread every frame,
// even offscreen. Transform-only Web Animations run on the compositor.
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
    for (const { animation } of this._running.values()) {
      animation.cancel();
    }
    this._running.clear();
  }

  private _sync = () => {
    for (const dot of this._running.keys()) {
      if (!dot.isConnected) {
        this._stop(dot);
      }
    }
    const layers =
      this._host.renderRoot.querySelectorAll<HTMLElement>(".flow-dots");
    if (!layers.length) {
      return;
    }
    this._resizeObserver ??= new ResizeObserver(this._sync);
    const sampled = new Map<string, Keyframe[]>();
    for (const layer of layers) {
      this._resizeObserver.observe(layer);
      const svg = layer.parentElement?.querySelector("svg");
      const dots = layer.querySelectorAll<HTMLElement>(".flow-dot");
      // Dots without a box can't run on the compositor and would tick the main thread
      if (!svg || !layer.offsetWidth) {
        dots.forEach((dot) => this._stop(dot));
        continue;
      }
      for (const dot of dots) {
        this._animate(layer, svg, dot, sampled);
      }
    }
  };

  private _stop(dot: HTMLElement) {
    this._running.get(dot)?.animation.cancel();
    this._running.delete(dot);
  }

  private _animate(
    layer: HTMLElement,
    svg: SVGSVGElement,
    dot: HTMLElement,
    sampled: Map<string, Keyframe[]>
  ) {
    const path = svg.querySelector<SVGGeometryElement>(
      `#${CSS.escape(dot.dataset.path!)}`
    );
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
    const geometry = [
      path.getAttribute("d"),
      ctm.a,
      ctm.b,
      ctm.c,
      ctm.d,
      ctm.e,
      ctm.f,
    ].join();
    const key = `${geometry}:${reverse}`;
    const running = this._running.get(dot);
    if (running?.key === key && running.duration === duration) {
      return;
    }
    let keyframes = running?.key === key ? running.keyframes : undefined;
    if (!keyframes) {
      let points = sampled.get(geometry);
      if (!points) {
        points = samplePath(path, ctm, scale);
        sampled.set(geometry, points);
      }
      keyframes = reverse ? [...points].reverse() : points;
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
    this._running.set(dot, { key, duration, keyframes, animation });
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
