import "@polymer/paper-input/paper-input";
import { customElement, LitElement, property } from "lit-element";
import { html } from "lit-html";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-yaml-editor";
import "../../../../../components/user/ha-users-picker";
import { EventTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-event")
export class HaEventTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: EventTrigger;

  public static get defaultConfig() {
    return { event_type: "" };
  }

  protected render() {
    const { event_type, event_data, context } = this.trigger;
    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.event_type"
        )}
        name="event_type"
        .value="${event_type}"
        @value-changed="${this._valueChanged}"
      ></paper-input>
      <ha-yaml-editor
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.event_data"
        )}
        .name=${"event_data"}
        .defaultValue=${event_data}
        @value-changed=${this._dataChanged}
      ></ha-yaml-editor>
      <br />
      ${this.hass.localize(
        "ui.panel.config.automation.editor.triggers.type.event.context_users"
      )}
      <ha-users-picker
        .pickedUserLabel=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.context_user_picked"
        )}
        .pickUserLabel=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.context_user_pick"
        )}
        .hass=${this.hass}
        .value=${this._wrapUsersInArray(context?.user_id)}
        @value-changed=${this._usersChanged}
      ></ha-users-picker>
    `;
  }

  private _wrapUsersInArray(user_id: string | string[] | undefined): string[] {
    if (!user_id) {
      return [];
    }
    if (typeof user_id === "string") {
      return [user_id];
    }
    return user_id;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    handleChangeEvent(this, ev);
  }

  private _dataChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    handleChangeEvent(this, ev);
  }

  private _usersChanged(ev) {
    ev.stopPropagation();
    const value = { ...this.trigger };
    if (!ev.detail.value.length && value.context) {
      delete value.context.user_id;
    } else {
      if (!value.context) {
        value.context = {};
      }
      value.context.user_id = ev.detail.value;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-event": HaEventTrigger;
  }
}
