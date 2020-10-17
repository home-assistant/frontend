import "@material/mwc-icon-button/mwc-icon-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import type { ToggleButton } from "../types";
import "./ha-svg-icon";

@customElement("ha-button-toggle-group")
export class HaButtonToggleGroup extends LitElement {
  @property({ attribute: false }) public buttons!: ToggleButton[];

  @property() public active?: string;

  protected render(): TemplateResult {
    return html`
      <div>
        ${this.buttons.map(
          (button) => html`
            <mwc-icon-button
              .label=${button.label}
              .value=${button.value}
              ?active=${this.active === button.value}
              @click=${this._handleClick}
            >
              <ha-svg-icon .path=${button.iconPath}></ha-svg-icon>
            </mwc-icon-button>
          `
        )}
      </div>
    `;
  }

  private _handleClick(ev): void {
    this.active = ev.currentTarget.value;
    fireEvent(this, "value-changed", { value: this.active });
  }

  static get styles(): CSSResult {
    return css`
      div {
        display: flex;
        --mdc-icon-button-size: var(--button-toggle-size, 36px);
        --mdc-icon-size: var(--button-toggle-icon-size, 20px);
      }
      mwc-icon-button {
        border: 1px solid var(--primary-color);
        border-right-width: 0px;
        position: relative;
        cursor: pointer;
      }
      mwc-icon-button::before {
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
      mwc-icon-button[active]::before {
        opacity: var(--mdc-icon-button-ripple-opacity, 0.12);
      }
      mwc-icon-button:first-child {
        border-radius: 4px 0 0 4px;
      }
      mwc-icon-button:last-child {
        border-radius: 0 4px 4px 0;
        border-right-width: 1px;
      }
      mwc-icon-button:only-child {
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
