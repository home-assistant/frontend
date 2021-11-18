import { css, CSSResultGroup, LitElement, svg, SVGTemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-svg-icon")
export class HaSvgIcon extends LitElement {
  @property() public path?: string;

  @property() public viewBox?: string;

  @property({ attribute: "background-color" }) public backgroundColor?: string;

  protected render(): SVGTemplateResult {
    return svg`
    <svg
      class="${this.backgroundColor ? "background" : ""}"
      style="background-color: ${
        this.backgroundColor ? this.backgroundColor : "undefined"
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
