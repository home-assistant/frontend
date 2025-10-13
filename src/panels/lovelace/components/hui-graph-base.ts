import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { strokeWidth } from "../../../data/graph";
import { getPath } from "../common/graph/get-path";

@customElement("hui-graph-base")
export class HuiGraphBase extends LitElement {
  @property() public coordinates?: any;

  @state() private _path?: string;

  protected render(): TemplateResult {
    return html`
      ${this._path
        ? svg`<svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
          <g>
            <mask id="fill">
              <path
                class='fill'
                fill='white'
                d="${this._path} L 500, 100 L 0, 100 z"
              />
            </mask>
            <rect height="100%" width="100%" id="fill-rect" fill="var(--accent-color)" mask="url(#fill)"></rect>
            <mask id="line">
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
            <rect height="100%" width="100%" id="rect" fill="var(--accent-color)" mask="url(#line)"></rect>
          </g>
        </svg>`
        : svg`<svg width="100%" height="100%" viewBox="0 0 500 100"></svg>`}
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-base": HuiGraphBase;
  }
}
