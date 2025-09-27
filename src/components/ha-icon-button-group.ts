import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-icon-button-group")
export class HaIconButtonGroup extends LitElement {
  protected render(): TemplateResult {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      height: 48px;
      border-radius: var(--ha-border-radius-4xl);
      background-color: rgba(139, 145, 151, 0.1);
      box-sizing: border-box;
      width: auto;
      padding: 0;
    }
    ::slotted(.separator) {
      background-color: rgba(var(--rgb-primary-text-color), 0.15);
      width: 1px;
      margin: 0 1px;
      height: 40px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-group": HaIconButtonGroup;
  }
}
