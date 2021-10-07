import "@material/mwc-icon-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-icon-button")
export class HaIconButton extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;

  // Regular icon name
  @property({ type: String }) icon?: string;

  // SVG icon path
  @property({ type: String }) path?: string;

  // Label that is used for ARIA support and as tooltip
  @property({ type: String }) label = "";

  @property({ type: Boolean }) hideTitle = false;

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
        ${this.icon ? html`<ha-icon .icon=${this.icon}></ha-icon>` : ""}
        ${this.path ? html`<ha-svg-icon .path=${this.path}></ha-svg-icon>` : ""}
      </mwc-icon-button>
    `;
  }

  public willUpdate(changedProps: PropertyValues): void {
    // Only actually import `ha-icon` if it gets used
    if (changedProps.has("icon") && this.icon) {
      import("./ha-icon");
    }
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
