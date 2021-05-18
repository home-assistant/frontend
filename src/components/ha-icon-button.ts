import "@material/mwc-icon-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-icon";

@customElement("ha-icon-button")
export class HaIconButton extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ type: String }) icon = "";

  @property({ type: String }) label = "";

  static shadowRootOptions: ShadowRootInit = {
    mode: "open",
    delegatesFocus: true,
  };

  protected render(): TemplateResult {
    return html`
      <mwc-icon-button .label=${this.label} .disabled=${this.disabled}>
        <ha-icon .icon=${this.icon}></ha-icon>
      </mwc-icon-button>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: inline-block;
        outline: none;
      }
      :host([disabled]) {
        pointer-events: none;
      }
      mwc-icon-button {
        --mdc-theme-on-primary: currentColor;
        --mdc-theme-text-disabled-on-light: var(--disabled-text-color);
      }
      ha-icon {
        --ha-icon-display: inline;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button": HaIconButton;
  }
}
