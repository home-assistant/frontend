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

  protected render(): SVGTemplateResult {
    return svg`
    <svg 
      viewBox="0 0 24 24" 
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
        display: var(--layout-inline_-_display);
        -ms-flex-align: var(--layout-center-center_-_-ms-flex-align);
        -webkit-align-items: var(--layout-center-center_-_-webkit-align-items);
        align-items: var(--layout-center-center_-_align-items);
        -ms-flex-pack: var(--layout-center-center_-_-ms-flex-pack);
        -webkit-justify-content: var(
          --layout-center-center_-_-webkit-justify-content
        );
        justify-content: var(--layout-center-center_-_justify-content);
        position: relative;
        vertical-align: middle;
        fill: var(--iron-icon-fill-color, currentcolor);
        stroke: var(--iron-icon-stroke-color, none);
        width: var(--iron-icon-width, 24px);
        height: var(--iron-icon-height, 24px);
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
