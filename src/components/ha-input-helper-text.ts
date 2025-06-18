import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-input-helper-text")
class InputHelperText extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;

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
      padding-inline-start: 16px;
      padding-inline-end: 16px;
      letter-spacing: var(
        --mdc-typography-caption-letter-spacing,
        0.0333333333em
      );
      line-height: normal;
    }
    :host([disabled]) {
      color: var(--mdc-text-field-disabled-ink-color, rgba(0, 0, 0, 0.6));
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-helper-text": InputHelperText;
  }
}
