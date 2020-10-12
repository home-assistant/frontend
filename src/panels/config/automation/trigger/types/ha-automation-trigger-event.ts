import "@polymer/paper-input/paper-input";
import {
  customElement,
  LitElement,
  property,
  internalProperty,
} from "lit-element";
import { html } from "lit-html";
import "../../../../../components/ha-yaml-editor";
import { EventTrigger } from "../../../../../data/automation";
import { fetchUsers, User } from "../../../../../data/user";
import { HomeAssistant } from "../../../../../types";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";
import "../../../../../components/user/ha-users-picker";

@customElement("ha-automation-trigger-event")
export class HaEventTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: EventTrigger;

  @internalProperty() private _users?: User[];

  public static get defaultConfig() {
    return { event_type: "", event_data: {}, context: { user_id: [] } };
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
      <ha-users-picker
        .pickedUserLabel=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.context_user_picked"
        )}
        .pickUserLabel=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.context_user_pick"
        )}
        .hass=${this.hass}
        .value=${this._wrapUsersInArray(context)}
        .users=${this._users}
        @value-changed=${this._valueChanged}
      ></ha-users-picker>
    `;
  }

  private _wrapUsersInArray(context): string[] {
    const empty: string[] = [];
    return empty.concat(context.user_id || []);
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

  protected firstUpdated(): void {
    if (!this._users) {
      this._getUsers();
    }
  }

  private async _getUsers(): Promise<void> {
    this._users = await fetchUsers(this.hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-event": HaEventTrigger;
  }
}
