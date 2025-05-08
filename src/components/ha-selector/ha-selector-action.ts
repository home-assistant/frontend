import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { Action } from "../../data/script";
import { migrateAutomationAction } from "../../data/script";
import type { ActionSelector } from "../../data/selector";
import "../../panels/config/automation/action/ha-automation-action";
import type { HomeAssistant } from "../../types";

@customElement("ha-selector-action")
export class HaActionSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: ActionSelector;

  @property({ attribute: false }) public value?: Action;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  private _actions = memoizeOne((action: Action | undefined) => {
    if (!action) {
      return [];
    }
    return migrateAutomationAction(action);
  });

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-automation-action
        .disabled=${this.disabled}
        .actions=${this._actions(this.value)}
        .hass=${this.hass}
      ></ha-automation-action>
    `;
  }

  static styles = css`
    ha-automation-action {
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
    "ha-selector-action": HaActionSelector;
  }
}
