import type { PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { array, assert, literal, object, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-check-list-item";
import "../../../../../components/ha-list";
import "../../../../../components/ha-switch";
import "../../../../../components/user/ha-user-badge";
import type { User } from "../../../../../data/user";
import { fetchUsers } from "../../../../../data/user";
import type { HomeAssistant } from "../../../../../types";
import type { UserCondition } from "../../../common/validate-condition";

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
      <ha-list @selected=${this._handleSelected} multi>
        ${this._sortedUsers(this._users).map(
          (user) => html`
            <ha-check-list-item
              graphic="avatar"
              hasMeta
              .selected=${selectedUsers.includes(user.id)}
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
      </ha-list>
    `;
  }

  private _handleSelected(
    ev: CustomEvent<{ diff: { added: number[]; removed: number[] } }>
  ) {
    const sortedUsers = this._sortedUsers(this._users);
    let users = this.condition.users ?? [];

    if (ev.detail.diff.added.length) {
      users = [...users, sortedUsers[ev.detail.diff.added[0]].id];
    } else if (ev.detail.diff.removed.length) {
      users = users.filter(
        (user) => user !== sortedUsers[ev.detail.diff.removed[0]].id
      );
    }

    const condition: UserCondition = {
      ...this.condition,
      users,
    };

    fireEvent(this, "value-changed", { value: condition });
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-list {
      --mdc-list-vertical-padding: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-user": HaCardConditionUser;
  }
}
