import { mdiClose } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { guard } from "lit-html/directives/guard";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { fetchUsers, User } from "../../data/user";
import type { PolymerChangedEvent } from "../../polymer-types";
import type { HomeAssistant } from "../../types";
import "./ha-user-picker";

@customElement("ha-users-picker")
class HaUsersPickerLight extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: string[];

  @property({ attribute: "picked-user-label" })
  public pickedUserLabel?: string;

  @property({ attribute: "pick-user-label" })
  public pickUserLabel?: string;

  @property({ attribute: false })
  public users?: User[];

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (this.users === undefined) {
      fetchUsers(this.hass!).then((users) => {
        this.users = users;
      });
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.users) {
      return html``;
    }

    const notSelectedUsers = this._notSelectedUsers(this.users, this.value);
    return html`
      ${guard([notSelectedUsers], () =>
        this.value?.map(
          (user_id, idx) => html`
            <div>
              <ha-user-picker
                .label=${this.pickedUserLabel}
                .noUserLabel=${this.hass?.localize(
                  "ui.components.user-picker.remove_user"
                )}
                .index=${idx}
                .hass=${this.hass}
                .value=${user_id}
                .users=${this._notSelectedUsersAndSelected(
                  user_id,
                  this.users,
                  notSelectedUsers
                )}
                @value-changed=${this._userChanged}
              ></ha-user-picker>
              <mwc-icon-button .userId=${user_id} @click=${this._removeUser}>
                <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
              </mwc-icon-button>
            </div>
          `
        )
      )}
      <ha-user-picker
        .noUserLabel=${this.pickUserLabel ||
        this.hass?.localize("ui.components.user-picker.add_user")}
        .hass=${this.hass}
        .users=${notSelectedUsers}
        .disabled=${!notSelectedUsers?.length}
        @value-changed=${this._addUser}
      ></ha-user-picker>
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

  private _userChanged(event: PolymerChangedEvent<string>) {
    event.stopPropagation();
    const index = (event.currentTarget as any).index;
    const newValue = event.detail.value;
    const newUsers = [...this._currentUsers];
    if (newValue === "") {
      newUsers.splice(index, 1);
    } else {
      newUsers.splice(index, 1, newValue);
    }
    this._updateUsers(newUsers);
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

  private _removeUser(event) {
    const userId = (event.currentTarget as any).userId;
    this._updateUsers(this._currentUsers.filter((user) => user !== userId));
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
      }
      div {
        display: flex;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-users-picker": HaUsersPickerLight;
  }
}
