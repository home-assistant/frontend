import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { strokeWidth } from "../../../data/graph";
import { getPath } from "../common/graph/get-path";

@customElement("hui-graph-base")
export class HuiGraphBase extends LitElement {
  @property({ attribute: false }) public coordinates?: number[][];

  @property({ attribute: "y-axis-origin", type: Number })
  public yAxisOrigin?: number;

  @property({ type: Boolean, reflect: true }) public preview = false;

  @state() private _path?: string;

  private _uniqueId = `graph-${Math.random().toString(36).substring(2, 9)}`;

  protected render(): TemplateResult {
    const width = this.clientWidth || 500;
    const height = this.clientHeight || width / 5;
    const yAxisOrigin = this.yAxisOrigin ?? height;
    const lastX = this.coordinates?.length
      ? this.coordinates[this.coordinates.length - 1][0]
      : width;

    if (this.preview) {
      const previewPath = `M 0,${height * 0.62} C ${width * 0.18},${height * 0.36} ${width * 0.28},${height * 0.74} ${width * 0.45},${height * 0.52} S ${width * 0.75},${height * 0.22} ${width},${height * 0.46}`;
      const previewScanId = `${this._uniqueId}-preview-scan`;

      return html`
        ${svg`<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id=${previewScanId} x1="-100%" x2="0%" y1="0" y2="0">
              <stop offset="0%" stop-color="var(--accent-color)" stop-opacity="0.3" />
              <stop offset="50%" stop-color="var(--accent-color)" stop-opacity="0.75" />
              <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0.3" />
              <animate attributeName="x1" values="-100%;100%" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="x2" values="0%;200%" dur="1.8s" repeatCount="indefinite" />
            </linearGradient>
          </defs>
          <path
            class="fill"
            fill="url(#${previewScanId})"
            d="${previewPath} L ${width}, ${height} L 0, ${height} z"
          />
          <path
            vector-effect="non-scaling-stroke"
            class="line"
            fill="none"
            stroke="url(#${previewScanId})"
            stroke-width="${strokeWidth}"
            stroke-linecap="round"
            stroke-linejoin="round"
            d=${previewPath}
          ></path>
        </svg>`}
      `;
    }

    return html`
      ${this._path
        ? svg`<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          <g>
            <mask id="${this._uniqueId}-fill">
              <path
                class='fill'
                fill='white'
                d="${this._path} L ${lastX}, ${yAxisOrigin} L 0, ${yAxisOrigin} z"
              />
            </mask>
            <rect height="100%" width="100%" fill="var(--accent-color)" mask="url(#${this._uniqueId}-fill)"></rect>
            <mask id="${this._uniqueId}-line">
              <path
                vector-effect="non-scaling-stroke"
                class='line'
                fill="none"
                stroke="white"
                stroke-width="${strokeWidth}"
                stroke-linecap="round"
                stroke-linejoin="round"
                d=${this._path}
              ></path>
            </mask>
            <rect height="100%" width="100%" fill="var(--accent-color)" mask="url(#${this._uniqueId}-line)"></rect>
          </g>
        </svg>`
        : svg`<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}"></svg>`}
    `;
  }

  public willUpdate(changedProps: PropertyValues<this>) {
    if (!this.coordinates) {
      return;
    }

    if (changedProps.has("coordinates")) {
      this._path = getPath(this.coordinates);
    }
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
    :host([preview]) .fill {
      opacity: 0.16;
    }
    :host([preview]) .line {
      opacity: 0.48;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-base": HuiGraphBase;
  }
}
