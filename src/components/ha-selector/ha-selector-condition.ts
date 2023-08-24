import { css, CSSResultGroup, html, LitElement } from "lit";
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

  @property() public nested?: boolean;

  @property() public reOrderMode?: boolean;

  protected render() {
    return html`
      ${this.label}
      <ha-automation-condition
        .disabled=${this.disabled}
        .conditions=${this.value || []}
        .hass=${this.hass}
        .nested=${this.nested}
        .reOrderMode=${this.reOrderMode}
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-condition": HaConditionSelector;
  }
}
