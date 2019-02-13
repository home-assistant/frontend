import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

class HaCard extends LitElement {
  @property() public header?: {};

  static get styles(): CSSResult {
    return css`
      :host {
        background: var(
          --ha-card-background,
          var(--paper-card-background-color, white)
        );
        border-radius: var(--ha-card-border-radius, 2px);
        box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14),
          0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2);
        color: var(--primary-text-color);
        display: block;
        transition: all 0.3s ease-out;
      }
      .header:not(:empty) {
        -webkit-font-smoothing: antialiased;
        font-family: Roboto, Noto, sans-serif;
        font-size: 24px;
        font-weight: 400;
        letter-spacing: -0.012em;
        line-height: 32px;
        opacity: 0.87;
        padding: 24px 16px 16px;
        text-rendering: optimizeLegibility;
      }
    `;
  }

  protected render(): TemplateResult {
    return html`
      <div class="header">${this.header}</div>
      <slot></slot>
    `;
  }
}

customElements.define("ha-card", HaCard);
