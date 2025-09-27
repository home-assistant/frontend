import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "./ha-ripple";

@customElement("ha-control-button")
export class HaControlButton extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;

  @property() public label?: string;

  protected render(): TemplateResult {
    return html`
      <button
        type="button"
        class="button"
        aria-label=${ifDefined(this.label)}
        title=${ifDefined(this.label)}
        .disabled=${Boolean(this.disabled)}
      >
        <slot></slot>
        <ha-ripple .disabled=${this.disabled}></ha-ripple>
      </button>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --control-button-focus-color: var(--secondary-text-color);
      --control-button-icon-color: var(--primary-text-color);
      --control-button-background-color: var(--disabled-color);
      --control-button-background-opacity: 0.2;
      --control-button-border-radius: var(--ha-border-radius-md);
      --control-button-padding: 8px;
      --mdc-icon-size: 20px;
      --ha-ripple-color: var(--secondary-text-color);
      color: var(--primary-text-color);
      width: 40px;
      height: 40px;
      -webkit-tap-highlight-color: transparent;
    }
    .button {
      overflow: hidden;
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      text-align: center;
      width: 100%;
      height: 100%;
      border-radius: var(--control-button-border-radius);
      border: none;
      margin: 0;
      padding: var(--control-button-padding);
      box-sizing: border-box;
      line-height: inherit;
      font-family: var(--ha-font-family-body);
      font-weight: var(--ha-font-weight-medium);
      outline: none;
      overflow: hidden;
      background: none;
      /* For safari border-radius overflow */
      z-index: 0;
      font-size: inherit;
      color: inherit;
      transition:
        box-shadow 180ms ease-in-out,
        color 180ms ease-in-out;
      color: var(--control-button-icon-color);
    }
    .button:focus-visible {
      box-shadow: 0 0 0 2px var(--control-button-focus-color);
    }
    .button::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background-color: var(--control-button-background-color);
      transition:
        background-color 180ms ease-in-out,
        opacity 180ms ease-in-out;
      opacity: var(--control-button-background-opacity);
      pointer-events: none;
      white-space: normal;
    }
    .button ::slotted(*) {
      pointer-events: none;
      opacity: 0.95;
    }
    .button:disabled {
      cursor: not-allowed;
      --control-button-background-color: var(--disabled-color);
      --control-button-icon-color: var(--disabled-text-color);
      --control-button-background-opacity: 0.2;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-button": HaControlButton;
  }
}
