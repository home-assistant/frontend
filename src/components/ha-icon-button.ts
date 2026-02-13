import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "./ha-button";
import "./ha-svg-icon";

@customElement("ha-icon-button")
export class HaIconButton extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;

  // SVG icon path (if you need a non SVG icon instead, use the provided slot to pass an <ha-icon> in)
  @property({ type: String }) path?: string;

  // Label that is used for ARIA support and as tooltip
  @property({ type: String }) label?: string;

  // These should always be set as properties, not attributes,
  // so that only the <button> element gets the attribute
  @property({ type: String, attribute: "aria-haspopup" })
  ariaHasPopup!: "false" | "true" | "menu" | "listbox" | "tree" | "grid";

  @property({ attribute: "hide-title", type: Boolean }) hideTitle = false;

  @property({ type: Boolean, reflect: true }) selected = false;

  static shadowRootOptions: ShadowRootInit = {
    mode: "open",
    delegatesFocus: true,
  };

  protected render(): TemplateResult {
    return html`
      <ha-button
        appearance="plain"
        variant="neutral"
        aria-label=${ifDefined(this.label)}
        title=${ifDefined(this.hideTitle ? undefined : this.label)}
        aria-haspopup=${ifDefined(this.ariaHasPopup)}
        .disabled=${this.disabled}
        .iconTag=${"ha-svg-icon"}
      >
        ${this.path
          ? html`<ha-svg-icon .path=${this.path}></ha-svg-icon>`
          : html`<slot></slot>`}
      </ha-button>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: inline-block;
      outline: none;
      position: relative;
      isolation: isolate;
      --ha-button-height: var(--ha-icon-button-size, 48px);
    }
    :host::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: -1;
      border-radius: 50%;
      background-color: currentColor;
      opacity: 0;
      pointer-events: none;
    }
    ha-button {
      --wa-form-control-padding-inline: var(
        --ha-icon-button-padding-inline,
        --ha-space-2
      );
      --wa-color-on-normal: currentColor;
      --wa-color-fill-quiet: transparent;
    }
    ha-button::part(base) {
      width: var(--wa-form-control-height);
      aspect-ratio: 1;
      outline-offset: -4px;
    }
    ha-button::part(label) {
      display: flex;
    }
    :host([selected])::after {
      opacity: 0.1;
    }

    @media (hover: hover) {
      :host(:hover:not([disabled]))::after {
        opacity: 0.1;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button": HaIconButton;
  }
}
