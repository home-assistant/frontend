import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

class HaCard extends LitElement {
  @property() public header?: string;
  @property() public heading?: string;

  static get styles(): CSSResult {
    return css`
      :host {
        background: var(
          --ha-card-background,
          var(--paper-card-background-color, white)
        );
        border-radius: var(--ha-card-border-radius, 2px);
        box-shadow: var(
          --ha-card-box-shadow,
          0 2px 2px 0 rgba(0, 0, 0, 0.14),
          0 1px 5px 0 rgba(0, 0, 0, 0.12),
          0 3px 1px -2px rgba(0, 0, 0, 0.2)
        );
        color: var(--primary-text-color);
        display: block;
        transition: all 0.3s ease-out;
        position: relative;
      }

      :host ::slotted(*) {
        display: block;
      }

      #header-slot:not(:empty), /* This matches if header/heading is set*/
      #header-slot::slotted(*),
      #default-slot::slotted(.card-header) {
        color: var(--ha-card-header-color, --primary-text-color);
        font-family: var(--ha-card-header-font-family, inherit);
        font-size: var(--ha-card-header-font-size, 24px);
        letter-spacing: -0.012em;
        line-height: 32px;
        padding: 24px 16px 0 16px;
        display: block;
      }

      #content-slot::slotted(*),
      #default-slot::slotted(.card-content) {
        padding: 16px;
        position: relative;
      }

      #actions-slot::slotted(*),
      #default-slot::slotted(.card-actions) {
        border-top: 1px solid #e8e8e8;
        padding: 5px 16px;
        position: relative;
      }
    `;
  }

  protected render(): TemplateResult {
    return html`
      <slot id="header-slot" name="header">${this.header}${this.heading}</slot>
      <slot id="default-slot"></slot>
      <slot id="content-slot" name="content"></slot>
      <slot id="actions-slot" name="actions"></slot>
    `;
  }
}

customElements.define("ha-card", HaCard);
