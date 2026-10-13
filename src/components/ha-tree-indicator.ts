import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-tree-indicator")
export class HaTreeIndicator extends LitElement {
  @property({ type: Boolean, reflect: true })
  public end?: boolean = false;

  protected render(): TemplateResult {
    // preserveAspectRatio="none" lets the connector stretch to the host box, so
    // it can span the full height of a taller row instead of being letterboxed
    // to a square in the middle. non-scaling-stroke keeps the line width and
    // dash pattern identical no matter how far it is stretched.
    return html`
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 48 48"
        preserveAspectRatio="none"
      >
        <line
          x1="24"
          y1="0"
          x2="24"
          y2=${this.end ? "24" : "48"}
          vector-effect="non-scaling-stroke"
        ></line>
        <line
          x1="24"
          y1="24"
          x2="36"
          y2="24"
          vector-effect="non-scaling-stroke"
        ></line>
      </svg>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 48px;
      height: 48px;
    }
    line {
      stroke: var(--divider-color);
      stroke-width: 2;
      stroke-dasharray: 2;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tree-indicator": HaTreeIndicator;
  }
}
