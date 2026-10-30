import type { PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { array, assert, literal, object, string } from "superstruct";
import {
  arrayWith,
  arrayWithout,
} from "../../../../../common/array/array-with";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stringCompare } from "../../../../../common/string/compare";
import "../../../../../components/item/ha-list-item-option";
import type { HaListItemOption } from "../../../../../components/item/ha-list-item-option";
import "../../../../../components/list/ha-list-selectable";
import type { HaListSelectable } from "../../../../../components/list/ha-list-selectable";
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

  protected async firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._fetchUsers();
  }

  private async _fetchUsers() {
    const users = await fetchUsers(this.hass.callWS);
    this._users = users.filter((user) => !user.system_generated);
  }

  protected render() {
    const selectedUsers = this.condition.users ?? [];

    return html`
      <ha-list-selectable
        multi
        aria-label=${this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.condition.user.label"
        )}
        @ha-list-item-selected=${this._handleUserToggled}
        @ha-list-item-deselected=${this._handleUserToggled}
      >
        ${this._sortedUsers(this._users).map(
          (user) => html`
            <ha-list-item-option
              appearance="checkbox"
              selection-position="end"
              .value=${user.id}
              .selected=${selectedUsers.includes(user.id)}
            >
              <ha-user-badge slot="start" .user=${user}></ha-user-badge>
              <span slot="headline">${user.name}</span>
            </ha-list-item-option>
          `
        )}
      </ha-list-selectable>
    `;
  }

  private _handleUserToggled(ev: CustomEvent<number>) {
    const option = (ev.currentTarget as HaListSelectable).items[ev.detail] as
      HaListItemOption | undefined;
    const userId = option?.value;
    if (!userId) {
      return;
    }

    const users =
      ev.type === "ha-list-item-selected"
        ? arrayWith(this.condition.users, userId)
        : arrayWithout(this.condition.users, userId);

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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-user": HaCardConditionUser;
  }
}
