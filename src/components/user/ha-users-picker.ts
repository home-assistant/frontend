import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { guard } from "lit/directives/guard";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { fetchUsers, User } from "../../data/user";
import type { ValueChangedEvent, HomeAssistant } from "../../types";
import "../ha-icon-button";
import "./ha-user-picker";

@customElement("ha-users-picker")
class HaUsersPickerLight extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: string[];

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  @property({ attribute: "picked-user-label" })
  public pickedUserLabel?: string;

  @property({ attribute: "pick-user-label" })
  public pickUserLabel?: string;

  @property({ attribute: false })
  public users?: User[];

  @property({ type: Boolean, attribute: "include-system" })
  public includeSystem?: boolean;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (this.users === undefined) {
      fetchUsers(this.hass!).then((users) => {
        this.users = users;
      });
    }
  }

  protected render() {
    if (!this.hass || !this.users) {
      return nothing;
    }

    const filteredUsers = this._filteredUsers(this.users, this.includeSystem);
    const selectedUsers = this._selectedUsers(filteredUsers, this.value);
    const notSelectedUsers = this._notSelectedUsers(filteredUsers, this.value);

    return html`
      ${guard([notSelectedUsers], () =>
        selectedUsers.map(
          (user, idx) => html`
            <div>
              <ha-user-picker
                .label=${this.pickedUserLabel}
                .index=${idx}
                .hass=${this.hass}
                .value=${user.id}
                .users=${this._notSelectedUsersAndCurrent(
                  user,
                  filteredUsers,
                  notSelectedUsers
                )}
                @value-changed=${this._userChanged}
                .disabled=${this.disabled}
                .includeSystem=${this.includeSystem}
              ></ha-user-picker>
            </div>
          `
        )
      )}
      <div>${this._renderPicker(notSelectedUsers)}</div>
    `;
  }

  private _renderPicker(users?: User[]) {
    return html`
      <ha-user-picker
        .label=${this.pickUserLabel}
        .hass=${this.hass}
        .users=${users}
        @value-changed=${this._addUser}
        .disabled=${this.disabled || users?.length === 0}
        .required=${this.required}
        .includeSystem=${this.includeSystem}
      ></ha-user-picker>
    `;
  }

  private _filteredUsers = memoizeOne(
    (users: User[], includeSystem?: boolean) =>
      users.filter((user) => includeSystem || !user.system_generated)
  );

  private _selectedUsers = memoizeOne(
    (users: User[], selectedUserIds?: string[]) => {
      if (!selectedUserIds) {
        return [];
      }
      return users.filter((user) => selectedUserIds.includes(user.id));
    }
  );

  private _notSelectedUsers = memoizeOne(
    (users: User[], selectedUserIds?: string[]) => {
      if (!selectedUserIds) {
        return users;
      }
      return users.filter((user) => !selectedUserIds.includes(user.id));
    }
  );

  private _notSelectedUsersAndCurrent = (
    currentUser: User,
    users?: User[],
    notSelected?: User[]
  ) => {
    const selectedUser = users?.find((user) => user.id === currentUser.id);
    if (selectedUser) {
      return notSelected ? [...notSelected, selectedUser] : [selectedUser];
    }
    return notSelected;
  };

  private get _currentUsers() {
    return this.value || [];
  }

  private async _updateUsers(users) {
    this.value = users;
    fireEvent(this, "value-changed", {
      value: users,
    });
  }

  private _userChanged(event: ValueChangedEvent<string>) {
    event.stopPropagation();
    const index = (event.currentTarget as any).index;
    const newValue = event.detail.value;
    const newUsers = [...this._currentUsers];
    if (newValue === undefined) {
      newUsers.splice(index, 1);
    } else {
      newUsers.splice(index, 1, newValue);
    }
    this._updateUsers(newUsers);
  }

  private async _addUser(event: ValueChangedEvent<string>) {
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

  static override styles = css`
    div {
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-users-picker": HaUsersPickerLight;
  }
}
