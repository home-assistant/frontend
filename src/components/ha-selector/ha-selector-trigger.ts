import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { Trigger } from "../../data/automation";
import { TriggerSelector } from "../../data/selector";
import "../../panels/config/automation/trigger/ha-automation-trigger";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-trigger")
export class HaTriggerSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: TriggerSelector;

  @property() public value?: Trigger;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-automation-trigger
        .disabled=${this.disabled}
        .triggers=${this.value || []}
        .hass=${this.hass}
        .nested=${this.selector.trigger?.nested}
        .reOrderMode=${this.selector.trigger?.reorder_mode}
      ></ha-automation-trigger>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-trigger {
        display: block;
        margin-bottom: 16px;
      }
      :host([disabled]) ha-automation-trigger {
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
    "ha-selector-trigger": HaTriggerSelector;
  }
}
