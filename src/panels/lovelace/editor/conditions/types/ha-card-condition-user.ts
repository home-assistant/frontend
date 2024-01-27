import "@material/mwc-list";
import { LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { array, assert, literal, object, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-check-list-item";
import "../../../../../components/ha-switch";
import "../../../../../components/user/ha-user-badge";
import { User, fetchUsers } from "../../../../../data/user";
import type { HomeAssistant } from "../../../../../types";
import { UserCondition } from "../../../common/validate-condition";

const userConditionStruct = object({
  condition: literal("user"),
  users: array(string()),
});

@customElement("ha-card-condition-user")
export class HaCardConditionUser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: UserCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): UserCondition {
    return { condition: "user", users: [] };
  }

  @state() private _users: User[] = [];

  protected static validateUIConfig(condition: UserCondition) {
    return assert(condition, userConditionStruct);
  }

  private _sortedUsers = memoizeOne((users: User[]) =>
    users.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass.locale.language)
    )
  );

  protected async firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchUsers();
  }

  private async _fetchUsers() {
    const users = await fetchUsers(this.hass);
    this._users = users.filter((user) => !user.system_generated);
  }

  protected render() {
    const selectedUsers = this.condition.users ?? [];

    return html`
      <mwc-list>
        ${this._sortedUsers(this._users).map(
          (user) => html`
            <ha-check-list-item
              graphic="avatar"
              hasMeta
              .userId=${user.id}
              .selected=${selectedUsers.includes(user.id)}
              @request-selected=${this._userChanged}
            >
              <ha-user-badge
                slot="graphic"
                .hass=${this.hass}
                .user=${user}
              ></ha-user-badge>
              <span>${user.name}</span>
            </ha-check-list-item>
          `
        )}
      </mwc-list>
    `;
  }

  private _userChanged(ev) {
    ev.stopPropagation();
    const selectedUsers = this.condition.users ?? [];
    const userId = ev.currentTarget.userId as string;
    const checked = ev.detail.selected as boolean;

    if (checked === selectedUsers.includes(userId)) {
      return;
    }

    let users = selectedUsers;
    if (checked) {
      users = [...users, userId];
    } else {
      users = users.filter((user) => user !== userId);
    }

    const condition: UserCondition = {
      ...this.condition,
      users,
    };

    fireEvent(this, "value-changed", { value: condition });
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      mwc-list {
        --mdc-list-vertical-padding: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-user": HaCardConditionUser;
  }
}
