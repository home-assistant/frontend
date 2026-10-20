import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { VERSION } from "./version";

/**
 * Button.
 *
 * Importing this module does not register the element. Use
 * `@home-assistant/hac/button` to register `<hac-button>` globally, or the
 * `scoped` and `dynamic` entry points next to it.
 *
 * @slot - Label of the button.
 * @slot icon - Icon displayed before the label.
 *
 * @csspart base - The native button.
 *
 * @cssprop --hac-button-color - Text and icon color.
 * @cssprop --hac-button-background - Background of filled buttons.
 * @cssprop --hac-button-border-radius - Border radius.
 * @cssprop --hac-button-height - Height.
 */
export class HacButton extends LitElement {
  /** Version of the component, read by `dynamic` loaders at runtime. */
  static readonly version = VERSION;

  static shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  /** Visual style of the button. */
  @property({ reflect: true }) public appearance:
    "filled" | "outlined" | "plain" = "filled";

  @property({ type: Boolean, reflect: true }) public disabled = false;

  /** Accessible label, required for buttons without a visible label. */
  @property() public label?: string;

  protected render() {
    return html`
      <button
        type="button"
        part="base"
        ?disabled=${this.disabled}
        aria-label=${ifDefined(this.accessibleLabel)}
      >
        ${this.renderContent()}
      </button>
    `;
  }

  /** Accessible label of the native button, overridden by icon buttons. */
  protected get accessibleLabel(): string | undefined {
    return this.label;
  }

  /** Content of the button, overridden by specialized buttons. */
  protected renderContent(): TemplateResult {
    return html`<slot name="icon"></slot><slot></slot>`;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: inline-block;
      vertical-align: middle;
      --_color: var(--hac-button-color, var(--primary-color, #03a9f4));
    }

    :host([appearance="filled"]) {
      --_color: var(--hac-button-color, var(--text-primary-color, #fff));
    }

    :host([disabled]) {
      pointer-events: none;
    }

    button {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--ha-space-2, 8px);
      box-sizing: border-box;
      width: 100%;
      height: var(--hac-button-height, 40px);
      padding: 0 var(--ha-space-4, 16px);
      border: 1px solid transparent;
      border-radius: var(
        --hac-button-border-radius,
        var(--ha-border-radius-pill, 9999px)
      );
      background: transparent;
      color: var(--_color);
      font: inherit;
      font-weight: var(--ha-font-weight-medium, 500);
      cursor: pointer;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }

    :host([appearance="filled"]) button {
      background: var(--hac-button-background, var(--primary-color, #03a9f4));
    }

    :host([appearance="outlined"]) button {
      border-color: currentColor;
    }

    /* State layer for hover and press feedback */
    button::before {
      content: "";
      position: absolute;
      inset: 0;
      background: currentColor;
      opacity: 0;
      transition: opacity 0.15s ease-out;
    }

    @media (hover: hover) {
      button:hover::before {
        opacity: 0.08;
      }
    }

    button:active::before {
      opacity: 0.12;
    }

    button:focus-visible {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: 2px;
    }

    button:disabled {
      cursor: default;
      opacity: 0.5;
    }

    ::slotted([slot="icon"]) {
      display: flex;
      flex: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hac-button": HacButton;
  }
}
