import {
  customElement,
  html,
  TemplateResult,
  property,
  LitElement,
  CSSResult,
  css,
} from "lit-element";

import "./ha-icon-button";

import { fireEvent } from "../common/dom/fire_event";
import type { ToggleButton } from "../types";

@customElement("ha-button-toggle-group")
export class HaButtonToggleGroup extends LitElement {
  @property({ attribute: false }) public buttons!: ToggleButton[];

  @property() public active?: string;

  protected render(): TemplateResult {
    if (this.buttons.length <= 1) {
      return html``;
    }

    return html`
      <div>
        ${this.buttons.map(
          (button) => html`
            <ha-icon-button
              .label=${button.label}
              .icon=${button.icon}
              .value=${button.value}
              ?active=${this.active === button.value}
              @click=${this._handleClick}
            >
            </ha-icon-button>
          `
        )}
      </div>
    `;
  }

  private _handleClick(ev): void {
    this.active = ev.target.value;
    fireEvent(this, "value-changed", { value: this.active });
  }

  static get styles(): CSSResult {
    return css`
      div {
        display: flex;
        --mdc-icon-button-size: var(--button-toggle-size, 36px);
        --mdc-icon-size: var(--button-toggle-icon-size, 20px);
      }
      ha-icon-button {
        border: 1px solid var(--primary-color);
        border-right-width: 0px;
        position: relative;
      }
      ha-icon-button::before {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        position: absolute;
        background-color: currentColor;
        opacity: 0;
        pointer-events: none;
        content: "";
        transition: opacity 15ms linear, background-color 15ms linear;
      }
      ha-icon-button[active]::before {
        opacity: var(--mdc-icon-button-ripple-opacity, 0.12);
      }
      ha-icon-button:first-child {
        border-radius: 4px 0 0 4px;
      }
      ha-icon-button:last-child {
        border-radius: 0 4px 4px 0;
        border-right-width: 1px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-toggle-button": HaButtonToggleGroup;
  }
}
