import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { Condition } from "../../data/automation";
import type { ConditionSelector } from "../../data/selector";
import "../../panels/config/automation/condition/ha-automation-condition";
import type { HomeAssistant } from "../../types";

@customElement("ha-selector-condition")
export class HaConditionSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public selector!: ConditionSelector;

  @property({ attribute: false }) public value?: Condition;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-automation-condition
        .disabled=${this.disabled}
        .conditions=${this.value || []}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .optionsInSidebar=${!!this.selector.condition?.optionsInSidebar}
      ></ha-automation-condition>
    `;
  }

  static styles = css`
    ha-automation-condition {
      display: block;
      margin-bottom: 16px;
    }
    label {
      display: block;
      margin-bottom: 4px;
      font-weight: var(--ha-font-weight-medium);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-condition": HaConditionSelector;
  }
}
