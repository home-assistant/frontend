import {
  css,
  CSSResult,
  customElement,
  LitElement,
  property,
  svg,
  SVGTemplateResult,
} from "lit-element";

@customElement("ha-svg-icon")
export class HaSvgIcon extends LitElement {
  @property() public path?: string;

  @property() public viewBox?: string;

  protected render(): SVGTemplateResult {
    return svg`
    <svg
      viewBox=${this.viewBox || "0 0 24 24"}
      preserveAspectRatio="xMidYMid meet"
      focusable="false">
      <g>
      ${this.path ? svg`<path d=${this.path}></path>` : ""}
      </g>
    </svg>`;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: var(--ha-icon-display, inline-flex);
        align-items: center;
        justify-content: center;
        position: relative;
        vertical-align: middle;
        fill: currentcolor;
        width: var(--mdc-icon-size, 24px);
        height: var(--mdc-icon-size, 24px);
      }
      svg {
        width: 100%;
        height: 100%;
        pointer-events: none;
        display: block;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-svg-icon": HaSvgIcon;
  }
}
