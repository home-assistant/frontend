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
      border-radius: 28px;
      background-color: rgba(139, 145, 151, 0.1);
      box-sizing: border-box;
      width: auto;
      padding: 0;
    }
    ::slotted(.separator) {
      background-color: rgb(from var(--primary-text-color) r g b / 0.15);
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
