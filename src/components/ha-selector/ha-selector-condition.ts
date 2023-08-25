import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { Condition } from "../../data/automation";
import { ConditionSelector } from "../../data/selector";
import "../../panels/config/automation/condition/ha-automation-condition";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-condition")
export class HaConditionSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: ConditionSelector;

  @property() public value?: Condition;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-automation-condition
        .disabled=${this.disabled}
        .conditions=${this.value || []}
        .hass=${this.hass}
        .nested=${this.selector.condition?.nested}
        .reOrderMode=${this.selector.condition?.reorder_mode}
      ></ha-automation-condition>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-condition {
        display: block;
        margin-bottom: 16px;
      }
      :host([disabled]) ha-automation-condition {
        opacity: var(--light-disabled-opacity);
        pointer-events: none;
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
    "ha-selector-condition": HaConditionSelector;
  }
}
