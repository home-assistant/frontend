import "@material/mwc-icon-button";
import {
  customElement,
  html,
  TemplateResult,
  property,
  LitElement,
  CSSResult,
  css,
} from "lit-element";
import "./ha-icon";

@customElement("ha-icon-button")
export class HaIconButton extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ type: String }) icon = "";

  @property({ type: String }) label = "";

  protected createRenderRoot() {
    return this.attachShadow({ mode: "open", delegatesFocus: true });
  }

  protected render(): TemplateResult {
    return html`
      <mwc-icon-button
        .label=${this.label || this.icon}
        ?disabled=${this.disabled}
        @click=${this._handleClick}
      >
        <ha-icon .icon=${this.icon}></ha-icon>
      </mwc-icon-button>
    `;
  }

  private _handleClick(ev) {
    if (this.disabled) {
      ev.stopPropagation();
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: inline-block;
        outline: none;
      }
      mwc-icon-button {
        --mdc-theme-on-primary: currentColor;
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
