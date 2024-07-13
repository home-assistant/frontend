import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { Action } from "../../data/script";
import { ActionSelector } from "../../data/selector";
import "../../panels/config/automation/action/ha-automation-action";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-action")
export class HaActionSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: ActionSelector;

  @property({ attribute: false }) public value?: Action;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-automation-action
        .disabled=${this.disabled}
        .actions=${this.value || []}
        .hass=${this.hass}
        .path=${this.selector.action?.path}
      ></ha-automation-action>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-action {
        display: block;
        margin-bottom: 16px;
      }
      label {
        display: block;
        margin-bottom: 4px;
        font-weight: 500;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-action": HaActionSelector;
  }
}
