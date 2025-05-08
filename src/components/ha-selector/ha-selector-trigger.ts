import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { Trigger } from "../../data/automation";
import { migrateAutomationTrigger } from "../../data/automation";
import type { TriggerSelector } from "../../data/selector";
import "../../panels/config/automation/trigger/ha-automation-trigger";
import type { HomeAssistant } from "../../types";

@customElement("ha-selector-trigger")
export class HaTriggerSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: TriggerSelector;

  @property({ attribute: false }) public value?: Trigger;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  private _triggers = memoizeOne((trigger: Trigger | undefined) => {
    if (!trigger) {
      return [];
    }
    return migrateAutomationTrigger(trigger);
  });

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-automation-trigger
        .disabled=${this.disabled}
        .triggers=${this._triggers(this.value)}
        .hass=${this.hass}
      ></ha-automation-trigger>
    `;
  }

  static styles = css`
    ha-automation-trigger {
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
    "ha-selector-trigger": HaTriggerSelector;
  }
}
