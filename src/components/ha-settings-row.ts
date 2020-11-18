import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  SVGTemplateResult,
} from "lit-element";

@customElement("ha-settings-row")
export class HaSettingsRow extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean, attribute: "three-line" })
  public threeLine = false;

  protected render(): SVGTemplateResult {
    return html`
      <mwc-list-item noninteractive ?twoline=${!this.threeLine}>
        <slot name="heading"></slot>
        <span slot="secondary"><slot name="description"></slot></span>
      </mwc-list-item>
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
        justify-content: space-between;
      }
      :host([narrow]) {
        align-items: normal;
        flex-direction: column;
        border-top: 1px solid var(--divider-color);
        padding-bottom: 8px;
      }
      mwc-list-item {
        --mdc-list-side-padding: 0;
      }
      ::slotted(ha-switch) {
        padding: 16px 0;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-settings-row": HaSettingsRow;
  }
}
