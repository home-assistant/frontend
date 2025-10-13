import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { guard } from "lit/directives/guard";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type { User } from "../../data/user";
import { fetchUsers } from "../../data/user";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-icon-button";
import "./ha-user-picker";

@customElement("ha-users-picker")
class HaUsersPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public value?: string[];

  @property({ attribute: "picked-user-label" })
  public pickedUserLabel?: string;

  @property({ attribute: "pick-user-label" })
  public pickUserLabel?: string;

  @property({ attribute: false })
  public users?: User[];

  @property({ type: Boolean }) public disabled = false;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (!this.users) {
      this._fetchUsers();
    }
  }

  private async _fetchUsers() {
    this.users = await fetchUsers(this.hass);
  }

  protected render() {
    if (!this.hass || !this.users) {
      return nothing;
    }

    const notSelectedUsers = this._notSelectedUsers(this.users, this.value);
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      ${guard([notSelectedUsers], () =>
        this.value?.map(
          (user_id, idx) => html`
            <div>
              <ha-user-picker
                .placeholder=${this.pickedUserLabel}
                .index=${idx}
                .hass=${this.hass}
                .value=${user_id}
                .users=${this._notSelectedUsersAndSelected(
                  user_id,
                  this.users,
                  notSelectedUsers
                )}
                .disabled=${this.disabled}
                @value-changed=${this._userChanged}
              ></ha-user-picker>
            </div>
          `
        )
      )}
      <div>
        <ha-user-picker
          .placeholder=${this.pickUserLabel ||
          this.hass!.localize("ui.components.user-picker.add_user")}
          .hass=${this.hass}
          .users=${notSelectedUsers}
          .disabled=${this.disabled || !notSelectedUsers?.length}
          @value-changed=${this._addUser}
        ></ha-user-picker>
      </div>
    `;
  }

  private _notSelectedUsers = memoizeOne(
    (users?: User[], currentUsers?: string[]) =>
      currentUsers
        ? users?.filter(
            (user) => !user.system_generated && !currentUsers.includes(user.id)
          )
        : users?.filter((user) => !user.system_generated)
  );

  private _notSelectedUsersAndSelected = (
    userId: string,
    users?: User[],
    notSelected?: User[]
  ) => {
    const selectedUser = users?.find((user) => user.id === userId);
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

  private _userChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    const index = (ev.currentTarget as any).index;
    const newValue = ev.detail.value;
    const newUsers = [...this._currentUsers];
    if (!newValue) {
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
    "ha-users-picker": HaUsersPicker;
  }
}
