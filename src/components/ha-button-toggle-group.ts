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
  @property() public buttons!: ToggleButton[];

  public defaultActiveIndex: number | undefined = 0;

  protected render(): TemplateResult {
    return html`
      ${this.buttons.map(
        (button, idx) => html` <ha-icon-button
          .label=${button.label}
          .icon=${button.icon}
          .value=${button.value}
          ?active=${this.defaultActiveIndex !== undefined &&
          idx === this.defaultActiveIndex}
          @click=${this._handleClick}
        >
        </ha-icon-button>`
      )}
    `;
  }

  protected firstUpdated(): void {
    if (this.defaultActiveIndex !== undefined) {
      fireEvent(this, "value-changed", {
        value: this.buttons[this.defaultActiveIndex].value,
      });
      this.defaultActiveIndex = undefined;
    }
  }

  private _handleClick(ev): void {
    const buttonPressed = ev.target;
    const activeButton = this.shadowRoot!.querySelector(
      "ha-icon-button[active]"
    );

    if (activeButton) {
      activeButton.removeAttribute("active");
    }
    buttonPressed.setAttribute("active", "");

    fireEvent(this, "value-changed", { value: buttonPressed.value });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        border-radius: 4px;
        border: 1px solid var(--button-toggle-outline, var(--primary-color));
        --mdc-icon-button-size: var(--button-toggle-size, 36px);
        --mdc-icon-size: var(--button-toggle-icon-size, 20px);
      }

      :host ha-icon-button {
        color: var(--button-toggle-text-color, var(--primary-color));
      }

      :host ha-icon-button[active] {
        background-color: var(
          --button-toggle-active-background-color,
          var(--light-primary-color)
        );
      }

      :host ha-icon-button:not(:first-child) {
        border-left: 1px solid
          var(--button-toggle-outline, var(--primary-color));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-toggle-button": HaButtonToggleGroup;
  }
}
