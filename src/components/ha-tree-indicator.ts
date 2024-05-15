import { LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-tree-indicator")
export class HaTreeIndicator extends LitElement {
  @property({ type: Boolean, reflect: true })
  public end?: boolean = false;

  protected render(): TemplateResult {
    return html`
      <svg width="100%" height="100%" viewBox="0 0 48 48">
        <line x1="24" y1="0" x2="24" y2=${this.end ? "24" : "48"}></line>
        <line x1="24" y1="24" x2="36" y2="24"></line>
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
