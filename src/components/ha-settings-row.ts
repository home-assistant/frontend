import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  SVGTemplateResult,
} from "lit-element";
import "@polymer/paper-item/paper-item-body";

@customElement("ha-settings-row")
export class HaSettingsRow extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean, attribute: "three-line" })
  public threeLine = false;

  protected render(): SVGTemplateResult {
    return html`
      <style>
        paper-item-body {
          padding-right: 16px;
        }
      </style>
      <paper-item-body
        ?two-line=${!this.threeLine}
        ?three-line=${this.threeLine}
      >
        <slot name="heading"></slot>
        <div secondary><slot name="description"></slot></div>
      </paper-item-body>
      <slot></slot>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        padding: 0 16px;
        align-content: normal;
        align-self: auto;
        align-items: center;
      }
      :host([narrow]) {
        align-items: normal;
        flex-direction: column;
        border-top: 1px solid var(--divider-color);
        padding-bottom: 8px;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-settings-row": HaSettingsRow;
  }
}
