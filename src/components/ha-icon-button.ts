import "@material/mwc-icon-button";
import type { IconButton } from "@material/mwc-icon-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "./ha-svg-icon";

@customElement("ha-icon-button")
export class HaIconButton extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;

  // SVG icon path (if you need a non SVG icon instead, use the provided slot to pass an <ha-icon> in)
  @property({ type: String }) path?: string;

  // Label that is used for ARIA support and as tooltip
  @property({ type: String }) label = "";

  @property({ type: Boolean }) hideTitle = false;

  @query("mwc-icon-button", true) private _button?: IconButton;

  public override focus() {
    this._button?.focus();
  }

  static shadowRootOptions: ShadowRootInit = {
    mode: "open",
    delegatesFocus: true,
  };

  protected render(): TemplateResult {
    // Note: `ariaLabel` required despite the `mwc-icon-button` docs saying `label` should be enough
    return html`
      <mwc-icon-button
        .ariaLabel=${this.label}
        .title=${this.hideTitle ? "" : this.label}
        .disabled=${this.disabled}
      >
        ${this.path
          ? html`<ha-svg-icon .path=${this.path}></ha-svg-icon>`
          : html`<slot></slot>`}
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button": HaIconButton;
  }
}
