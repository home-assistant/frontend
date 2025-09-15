import { consume, ContextProvider } from "@lit/context";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fullEntitiesContext } from "../../data/context";
import {
  subscribeEntityRegistry,
  type EntityRegistryEntry,
} from "../../data/entity_registry";
import type { Action } from "../../data/script";
import { migrateAutomationAction } from "../../data/script";
import type { ActionSelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import "../../panels/config/automation/action/ha-automation-action";
import type HaAutomationAction from "../../panels/config/automation/action/ha-automation-action";
import type { HomeAssistant } from "../../types";

@customElement("ha-selector-action")
export class HaActionSelector extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public selector!: ActionSelector;

  @property({ attribute: false }) public value?: Action;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg: EntityRegistryEntry[] | undefined;

  @state() private _entitiesContext;

  @query("ha-automation-action")
  private _actionElement?: HaAutomationAction;

  protected hassSubscribeRequiredHostProps = ["_entitiesContext"];

  private _actions = memoizeOne((action: Action | undefined) => {
    if (!action) {
      return [];
    }
    return migrateAutomationAction(action);
  });

  protected firstUpdated() {
    if (!this._entityReg) {
      this._entitiesContext = new ContextProvider(this, {
        context: fullEntitiesContext,
        initialValue: [],
      });
    }
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entitiesContext.setValue(entities);
      }),
    ];
  }

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
