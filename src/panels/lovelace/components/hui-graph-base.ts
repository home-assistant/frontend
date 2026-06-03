import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { MediaQueriesListener } from "../../../common/dom/media_query";
import { listenMediaQuery } from "../../../common/dom/media_query";
import { parseAnimationDuration } from "../../../common/util/parse-animation-duration";
import { strokeWidth } from "../../../data/graph";
import { getPath } from "../common/graph/get-path";

export interface HuiGraphGradient {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: { offset: number; color: string }[];
}

@customElement("hui-graph-base")
export class HuiGraphBase extends LitElement {
  @property({ attribute: false }) public coordinates?: number[][];

  @property({ attribute: "y-axis-origin", type: Number })
  public yAxisOrigin?: number;

  @property({ type: Boolean, reflect: true }) public loading = false;

  @property({ attribute: false }) public gradient?: HuiGraphGradient;

  private _uniqueId = `graph-${Math.random().toString(36).substring(2, 9)}`;

  @state()
  private _displayCoordinates?: number[][];

  @state()
  private _reducedMotion = false;

  private _unsubMediaQuery?: MediaQueriesListener;

  private _animationFrame?: number;

  protected render(): TemplateResult {
    const width = this.clientWidth || 500;
    const height = this.clientHeight || width / 5;
    const yAxisOrigin = this.yAxisOrigin ?? height;
    const path =
      (this._displayCoordinates && getPath(this._displayCoordinates)) ??
      (this.loading ? `M 0,${height / 2} L ${width},${height / 2}` : undefined);
    const lastX = this._displayCoordinates?.length
      ? this._displayCoordinates[this._displayCoordinates.length - 1][0]
      : width;

    if (!path) {
      return html`
        ${svg`<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}"></svg>`}
      `;
    }

    const showShimmer = this.loading && !this._reducedMotion;
    const shimmerId = `${this._uniqueId}-shimmer`;
    const gradientId = `${this._uniqueId}-gradient`;
    const gradient = this.gradient;
    const fillRect = showShimmer
      ? `url(#${shimmerId})`
      : gradient
        ? `url(#${gradientId})`
        : "var(--accent-color)";

    return html`
      ${svg`<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        ${
          showShimmer
            ? svg`<defs>
                <linearGradient id=${shimmerId} x1="-50%" x2="-30%" y1="0" y2="0">
                  <stop offset="0%" stop-color="var(--accent-color)" />
                  <stop offset="50%" stop-color="white" />
                  <stop offset="100%" stop-color="var(--accent-color)" />
                  <animate attributeName="x1" values="-50%;120%" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="x2" values="-30%;140%" dur="1.8s" repeatCount="indefinite" />
                </linearGradient>
              </defs>`
            : gradient
              ? svg`<defs>
                  <linearGradient
                    id=${gradientId}
                    gradientUnits="userSpaceOnUse"
                    x1=${gradient.x1} y1=${gradient.y1}
                    x2=${gradient.x2} y2=${gradient.y2}
                  >
                    ${gradient.stops.map(
                      (s) =>
                        svg`<stop offset=${s.offset} style="stop-color: ${s.color}"></stop>`
                    )}
                  </linearGradient>
                </defs>`
              : nothing
        }
        <g>
          <mask id="${this._uniqueId}-fill">
            <path
              class="fill"
              fill="white"
              d="${path} L ${lastX}, ${yAxisOrigin} L 0, ${yAxisOrigin} z"
            />
          </mask>
          <rect height="100%" width="100%" fill=${fillRect} mask="url(#${this._uniqueId}-fill)"></rect>
          <mask id="${this._uniqueId}-line">
            <path
              vector-effect="non-scaling-stroke"
              class="line"
              fill="none"
              stroke="white"
              stroke-width="${strokeWidth}"
              stroke-linecap="round"
              stroke-linejoin="round"
              d=${path}
            ></path>
          </mask>
          <rect height="100%" width="100%" fill=${fillRect} mask="url(#${this._uniqueId}-line)"></rect>
        </g>
      </svg>`}
    `;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._unsubMediaQuery = listenMediaQuery(
      "(prefers-reduced-motion: reduce)",
      (matches) => {
        if (this._reducedMotion !== matches) {
          this._reducedMotion = matches;
        }
      }
    );
  }

  public willUpdate(changedProps: PropertyValues<this>) {
    if (!this.coordinates) {
      return;
    }

    if (changedProps.has("coordinates")) {
      this._setCoordinates(this.coordinates);
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubMediaQuery?.();
    this._unsubMediaQuery = undefined;
    this._cancelAnimation();
  }

  private _setCoordinates(coordinates: number[][]) {
    this._cancelAnimation();

    const displayCoordinates = this._displayCoordinates;

    if (!displayCoordinates || coordinates.length < 2) {
      this._displayCoordinates = coordinates;
      return;
    }

    const duration = parseAnimationDuration(
      getComputedStyle(this).getPropertyValue("--ha-animation-duration-slow")
    );

    if (duration <= 1) {
      this._displayCoordinates = coordinates;
      return;
    }

    const fromCoordinates = coordinates.map((coord) => [
      coord[0],
      this._interpolateY(displayCoordinates, coord[0]),
    ]);
    const start = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;

      this._displayCoordinates = coordinates.map((coord, index) => [
        coord[0],
        fromCoordinates[index][1] +
          (coord[1] - fromCoordinates[index][1]) * easedProgress,
      ]);

      if (progress < 1) {
        this._animationFrame = requestAnimationFrame(animate);
      } else {
        this._animationFrame = undefined;
      }
    };

    this._animationFrame = requestAnimationFrame(animate);
  }

  private _interpolateY(coordinates: number[][], x: number): number {
    if (!coordinates.length) {
      return 0;
    }

    if (x <= coordinates[0][0]) {
      return coordinates[0][1];
    }

    for (let i = 1; i < coordinates.length; i++) {
      const current = coordinates[i];

      if (x > current[0]) {
        continue;
      }

      const previous = coordinates[i - 1];
      const xDelta = current[0] - previous[0];

      if (!xDelta) {
        return current[1];
      }

      const progress = (x - previous[0]) / xDelta;

      return previous[1] + (current[1] - previous[1]) * progress;
    }

    return coordinates[coordinates.length - 1][1];
  }

  private _cancelAnimation() {
    if (this._animationFrame === undefined) {
      return;
    }

    cancelAnimationFrame(this._animationFrame);
    this._animationFrame = undefined;
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
    }
    .line {
      opacity: 0.8;
    }
    .fill {
      opacity: 0.1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-base": HuiGraphBase;
  }
}
