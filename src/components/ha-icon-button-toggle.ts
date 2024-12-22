import { css, CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { HaIconButton } from "./ha-icon-button";

@customElement("ha-icon-button-toggle")
export class HaIconButtonToggle extends HaIconButton {
  @property({ type: Boolean, reflect: true }) selected = false;

  static get styles(): CSSResultGroup {
    return css`
      :host {
        position: relative;
      }
      mwc-icon-button {
        position: relative;
        transition: color 180ms ease-in-out;
      }
      mwc-icon-button::before {
        opacity: 0;
        transition: opacity 180ms ease-in-out;
        background-color: var(--primary-text-color);
        border-radius: 20px;
        height: 40px;
        width: 40px;
        content: "";
        position: absolute;
        top: -10px;
        left: -10px;
        bottom: -10px;
        right: -10px;
        margin: auto;
        box-sizing: border-box;
      }
      :host([border-only]) mwc-icon-button::before {
        background-color: transparent;
        border: 2px solid var(--primary-text-color);
      }
      :host([selected]) mwc-icon-button {
        color: var(--primary-background-color);
      }
      :host([selected]:not([disabled])) mwc-icon-button::before {
        opacity: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-toggle": HaIconButtonToggle;
  }
}
