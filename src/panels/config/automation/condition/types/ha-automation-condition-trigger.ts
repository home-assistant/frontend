import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { ensureArray } from "../../../../../common/ensure-array";
import {
  AutomationConfig,
  Trigger,
  TriggerCondition,
} from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-condition-trigger")
export class HaTriggerCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TriggerCondition;

  @state() private _triggers?: Trigger | Trigger[];

  private _unsub?: UnsubscribeFunc;

  public static get defaultConfig() {
    return {
      id: "",
    };
  }

  connectedCallback() {
    super.connectedCallback();
    const details = { callback: (config) => this._automationUpdated(config) };
    fireEvent(this, "subscribe-automation-config", details);
    this._unsub = (details as any).unsub;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub();
    }
  }

  protected render() {
    const { id } = this.condition;
    if (!this._triggers) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.no_triggers"
      );
    }
    return html`<paper-dropdown-menu-light
      .label=${this.hass.localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.id"
      )}
      no-animations
    >
      <paper-listbox
        slot="dropdown-content"
        .selected=${id}
        attr-for-selected="data-trigger-id"
        @selected-item-changed=${this._triggerPicked}
      >
        ${ensureArray(this._triggers).map((trigger) =>
          trigger.id
            ? html`
                <paper-item data-trigger-id=${trigger.id}>
                  ${trigger.id}
                </paper-item>
              `
            : ""
        )}
      </paper-listbox>
    </paper-dropdown-menu-light>`;
  }

  private _automationUpdated(config?: AutomationConfig) {
    this._triggers = config?.trigger;
  }

  private _triggerPicked(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.value) {
      return;
    }
    const newTrigger = ev.detail.value.dataset.triggerId;
    if (this.condition.id === newTrigger) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.condition, id: newTrigger },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-trigger": HaTriggerCondition;
  }
}
