import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { SequenceSelector } from "../../data/selector";
import { Action } from "../../data/script";
import "../../panels/config/automation/action/ha-automation-action";

@customElement("ha-selector-sequence")
export class HaSequenceSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: SequenceSelector;

  @property() public value?: Action;

  @property() public label?: string;

  protected render() {
    return html`<ha-automation-action
      .actions=${this.value || []}
      .hass=${this.hass}
    ></ha-automation-action>`;
  }

  static get styles(): CSSResult {
    return css`
      ha-automation-action {
        display: block;
        margin-bottom: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-sequence": HaSequenceSelector;
  }
}
