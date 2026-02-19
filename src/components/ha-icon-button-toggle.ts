import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { HaIconButton } from "./ha-icon-button";

@customElement("ha-icon-button-toggle")
export class HaIconButtonToggle extends HaIconButton {
  @property({ type: Boolean, reflect: true }) selected = false;

  static styles: CSSResultGroup = [
    HaIconButton.styles,
    css`
      :host {
        position: relative;
      }
      ha-button::part(base) {
        position: relative;
        transition: color 180ms ease-in-out;
      }
      ha-button::part(base)::before {
        opacity: 0;
        transition: opacity 180ms ease-in-out;
        background-color: var(--primary-text-color);
        border-radius: var(--ha-border-radius-2xl);
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
      :host([border-only]) ha-button::part(base)::before {
        background-color: transparent;
        border: 2px solid var(--primary-text-color);
      }
      :host([selected]) ha-button::part(base) {
        color: var(--primary-background-color);
        background-color: unset;
      }
      :host([selected]:not([disabled])) ha-button::part(base)::before {
        opacity: 1;
      }
      ::slotted(*) {
        display: block;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-toggle": HaIconButtonToggle;
  }
}
