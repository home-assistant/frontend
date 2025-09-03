import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { strokeWidth } from "../../../data/graph";
import { getPath } from "../common/graph/get-path";

export const GRAPH_BASE_WIDTH = 500;
export const GRAPH_BASE_HEIGHT = 100;

@customElement("hui-graph-base")
export class HuiGraphBase extends LitElement {
  @property({ attribute: false }) public coordinates?: [number, number][];

  @property({ type: Boolean }) public responsive = false;

  @state() private _path?: string;

  @state() private _width = GRAPH_BASE_WIDTH;

  @state() private _height = GRAPH_BASE_HEIGHT;

  private _resizeObserver?: ResizeObserver;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.responsive) {
      return;
    }
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this._width = width;
        this._height = height;
        this._recomputePath();
      }
    });
    this._resizeObserver.observe(this);
  }

  disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    super.disconnectedCallback();
  }

  protected render(): TemplateResult {
    if (!this._width || !this._height) {
      return html`<svg></svg>`;
    }

    const content = svg`
      <g>
          <mask id="fill">
            <path
              class="fill"
              fill="white"
              d="${this._path} L ${this._width},${this._height} L 0,${this._height} z"
            />
          </mask>
          <rect width="100%" height="100%" fill="var(--accent-color)" mask="url(#fill)" />

          <mask id="line">
            <path
              class="line"
              fill="none"
              stroke="white"
              stroke-width="${this.responsive ? 2 : strokeWidth}"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="${this._path}"
            />
          </mask>
          <rect width="100%" height="100%" fill="var(--accent-color)" mask="url(#line)" />
        </g>
        `;

    if (this.responsive) {
      return html`
        <svg width=${this._width} height=${this._height}>${content}</svg>
      `;
    }

    return html`
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 ${this._width} ${this._height}"
      >
        ${content}
      </svg>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("coordinates")) {
      this._recomputePath();
    }
  }

  private _recomputePath() {
    if (!this.coordinates || !this._width || !this._height) {
      return;
    }

    if (!this.responsive) {
      this._path = getPath(this.coordinates);
      return;
    }

    const scaleX = (x: number) => (x / GRAPH_BASE_WIDTH) * this._width;
    const scaleY = (y: number) => (y / GRAPH_BASE_HEIGHT) * this._height;

    // Passe les coordonnées à getPath mais scalées
    this._path = getPath(
      this.coordinates.map(([x, y]) => [scaleX(x), scaleY(y)])
    );
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
