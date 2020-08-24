import {
  customElement,
  html,
  TemplateResult,
  property,
  LitElement,
  CSSResult,
  css,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { fireEvent } from "../common/dom/fire_event";
import type { ToggleButton } from "../types";

import "./ha-icon-button";
import "./ha-svg-icon";

@customElement("ha-button-toggle-group")
export class HaButtonToggleGroup extends LitElement {
  @property({ attribute: false }) public buttons!: ToggleButton[];

  @property() public active?: string;

  protected render(): TemplateResult {
    return html`
      <div class=${classMap({ single: this.buttons.length === 1 })}>
        ${this.buttons.map(
          (button) => html`
            <ha-svg-icon
              .label=${button.label}
              .path=${button.iconPath}
              .value=${button.value}
              ?active=${this.active === button.value}
              @click=${this._handleClick}
            >
            </ha-svg-icon>
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
        --mdc-icon-size: var(--button-toggle-icon-size, 20px);
      }
      ha-svg-icon {
        border: 1px solid var(--primary-color);
        border-right-width: 0px;
        position: relative;
        padding: 6px;
        cursor: pointer;
      }
      ha-svg-icon::before {
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
      ha-svg-icon[active]::before {
        opacity: var(--mdc-icon-button-ripple-opacity, 0.12);
      }
      ha-svg-icon:first-child {
        border-radius: 4px 0 0 4px;
      }
      ha-svg-icon:last-child {
        border-radius: 0 4px 4px 0;
        border-right-width: 1px;
      }
      .single ha-svg-icon {
        border-radius: 4px;
        border-right-width: 1px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-toggle-group": HaButtonToggleGroup;
  }
}
