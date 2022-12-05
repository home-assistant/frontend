import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-input-helper-text")
class InputHelperText extends LitElement {
  protected render(): TemplateResult {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: block;
      color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6));
      font-size: 0.75rem;
      padding-left: 16px;
      padding-right: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-helper-text": InputHelperText;
  }
}
