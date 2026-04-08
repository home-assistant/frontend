import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fullEntitiesContext } from "../../data/context/context";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";
import type { Action } from "../../data/script";
import { migrateAutomationAction } from "../../data/script";
import type { ActionSelector } from "../../data/selector";
import "../../panels/config/automation/action/ha-automation-action";
import type HaAutomationAction from "../../panels/config/automation/action/ha-automation-action";
import type { HomeAssistant } from "../../types";

@customElement("ha-selector-action")
export class HaActionSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public selector!: ActionSelector;

  @property({ attribute: false }) public value?: Action;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg: EntityRegistryEntry[] | undefined;

  @query("ha-automation-action")
  private _actionElement?: HaAutomationAction;

  private _actions = memoizeOne((action: Action | undefined) => {
    if (!action) {
      return [];
    }
    return migrateAutomationAction(action);
  });

  public expandAll() {
    this._actionElement?.expandAll();
  }

  public collapseAll() {
    this._actionElement?.collapseAll();
  }

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-automation-action
        .disabled=${this.disabled}
        .actions=${this._actions(this.value)}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .optionsInSidebar=${!!this.selector.action?.optionsInSidebar}
      ></ha-automation-action>
    `;
  }

  static styles = css`
    ha-automation-action {
      display: block;
    }
    label {
      display: block;
      margin-bottom: 4px;
      font-weight: var(--ha-font-weight-medium);
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-action": HaActionSelector;
  }
}
