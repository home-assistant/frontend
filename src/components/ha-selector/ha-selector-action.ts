import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { Action } from "../../data/script";
import { ActionSelector } from "../../data/selector";
import "../../panels/config/automation/action/ha-automation-action";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-action")
export class HaActionSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: ActionSelector;

  @property() public value?: Action;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected render() {
    return html`<ha-automation-action
      .disabled=${this.disabled}
      .actions=${this.value || []}
      .hass=${this.hass}
    ></ha-automation-action>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-action {
        display: block;
        margin-bottom: 16px;
      }
      :host([disabled]) ha-automation-action {
        opacity: var(--light-disabled-opacity);
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-action": HaActionSelector;
  }
}
