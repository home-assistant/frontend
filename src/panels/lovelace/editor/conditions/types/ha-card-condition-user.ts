import "@material/mwc-list";
import { html, css, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-switch";
import "../../../../../components/user/ha-user-badge";
import { fetchUsers, User } from "../../../../../data/user";
import type { HomeAssistant } from "../../../../../types";
import { UserCondition } from "../../../common/validate-condition";

@customElement("ha-card-condition-user")
export class HaCardConditionUser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: UserCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): UserCondition {
    return { condition: "user", users: [] };
  }

  @state() private _users: User[] = [];

  private _sortedUsers = memoizeOne((users: User[]) =>
    users.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass.locale.language)
    )
  );

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    fetchUsers(this.hass).then((users) => {
      this._users = users.filter((user) => !user.system_generated);
      fireEvent(this, "iron-resize");
    });
  }

  protected render() {
    const selectedUsers = this.condition.users ?? [];

    return html`
      <mwc-list>
        ${this._sortedUsers(this._users).map(
          (user) => html`
            <ha-list-item graphic="avatar" hasMeta noninteractive>
              <ha-user-badge
                slot="graphic"
                .hass=${this.hass}
                .user=${user}
              ></ha-user-badge>
              <span>${user.name}</span>
              <ha-switch
                slot="meta"
                .userId=${user.id}
                @change=${this._userChanged}
                .checked=${selectedUsers.includes(user.id)}
              ></ha-switch>
            </ha-list-item>
          `
        )}
      </mwc-list>
    `;
  }

  private _userChanged(ev) {
    ev.stopPropagation();
    const selectedUsers = this.condition.users ?? [];
    const userId = ev.target.userId as string;
    const checked = ev.target.checked as boolean;

    const users = [...selectedUsers];
    if (checked) {
      users.push(userId);
    } else {
      users.splice(users.indexOf(userId), 1);
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
      ha-list-item {
        overflow: visible;
        padding-inline-start: 0;
        direction: var(--direction);
      }
      ha-switch {
        padding: 13px 5px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-user": HaCardConditionUser;
  }
}
