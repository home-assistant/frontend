import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import type { PolymerChangedEvent } from "../../polymer-types";
import type { HomeAssistant } from "../../types";
import { fetchUsers, User } from "../../data/user";
import "./ha-user-picker";

@customElement("ha-users-picker")
class HaUsersPickerLight extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: string[];

  @property({ attribute: "picked-user-label" })
  public pickedUserLabel?: string;

  @property({ attribute: "pick-user-label" })
  public pickUserLabel?: string;

  @property({ type: Array, attribute: "users" })
  public users?: User[];

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    const currentUsers = this._currentUsers;
    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
    console.log(currentUsers);
    return html`
      ${currentUsers.map(
        (user_id) => html`
          <div>
            <ha-user-picker
              .label=${this.pickedUserLabel}
              .curValue=${user_id}
              .hass=${this.hass}
              .value=${user_id}
              .users=${this.users}
              @value-changed=${this._userChanged}
            ></ha-user-picker>
          </div>
        `
      )}
      <ha-user-picker
        .label=${this.pickUserLabel}
        .hass=${this.hass}
        .users=${this.users}
        @value-changed=${this._addUser}
      ></ha-user-picker>
    `;
  }

  private get _currentUsers() {
    return this.value || [];
  }

  private async _updateUsers(users) {
    this.value = users;
    fireEvent(this, "value-changed", {
      value: users,
    });
  }

  private _userChanged(event: PolymerChangedEvent<string>) {
    event.stopPropagation();
    const curValue = (event.currentTarget as any).curValue;
    const newValue = event.detail.value;
    if (newValue === curValue) {
      return;
    }
    if (newValue === "") {
      this._updateUsers(this._currentUsers.filter((user) => user !== curValue));
    } else {
      this._updateUsers(
        this._currentUsers.map((user) => (user === curValue ? newValue : user))
      );
    }
  }

  private async _addUser(event: PolymerChangedEvent<string>) {
    event.stopPropagation();
    const toAdd = event.detail.value;
    (event.currentTarget as any).value = "";
    if (!toAdd) {
      return;
    }
    const currentUsers = this._currentUsers;
    if (currentUsers.includes(toAdd)) {
      return;
    }

    this._updateUsers([...currentUsers, toAdd]);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-users-picker": HaUsersPickerLight;
  }
}
