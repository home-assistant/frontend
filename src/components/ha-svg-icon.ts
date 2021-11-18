import { css, CSSResultGroup, LitElement, svg, SVGTemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { getColorByIndex } from "../common/color/colors";

@customElement("ha-svg-icon")
export class HaSvgIcon extends LitElement {
  @property() public path?: string;

  @property() public viewBox?: string;

  @property({ type: Boolean }) public background = false;

  protected render(): SVGTemplateResult {
    return svg`
    <svg
      class="${this.background ? "background" : ""}"
      style="background-color: ${
        this.background ? getColorByIndex(this.path?.length || 0) : "undefined"
      };"
      viewBox=${this.viewBox || "0 0 24 24"}
      preserveAspectRatio="xMidYMid meet"
      focusable="false">
      <g>
      ${this.path ? svg`<path d=${this.path}></path>` : ""}
      </g>
    </svg>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: var(--ha-icon-display, inline-flex);
        align-items: center;
        justify-content: center;
        position: relative;
        vertical-align: middle;
        fill: currentcolor;
      }
      .background {
        padding: 8px;
        border-radius: 50%;
      }
      svg {
        width: var(--mdc-icon-size, 24px);
        height: var(--mdc-icon-size, 24px);
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
