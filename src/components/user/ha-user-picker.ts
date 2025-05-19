import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type { User } from "../../data/user";
import { fetchUsers } from "../../data/user";
import type { HomeAssistant } from "../../types";
import "../ha-combo-box-item";
import "../ha-generic-picker";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";
import type { PickerValueRenderer } from "../ha-picker-field";
import "./ha-user-badge";

interface UserComboBoxItem extends PickerComboBoxItem {
  user?: User;
}

@customElement("ha-user-picker")
class HaUserPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property({ attribute: false }) public noUserLabel?: string;

  @property() public value = "";

  @property({ attribute: false }) public users?: User[];

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

  private usersMap = memoizeOne((users?: User[]): Map<string, User> => {
    if (!users) {
      return new Map();
    }
    return new Map(users.map((user) => [user.id, user]));
  });

  private _valueRenderer: PickerValueRenderer = (value) => {
    const user = this.usersMap(this.users).get(value);
    if (!user) {
      return html` <span slot="headline">${value}</span> `;
    }

    return html`
      <ha-user-badge
        slot="start"
        .hass=${this.hass}
        .user=${user}
      ></ha-user-badge>
      <span slot="headline">${user.name}</span>
    `;
  };

  private _rowRenderer: ComboBoxLitRenderer<UserComboBoxItem> = (item) => {
    const user = item.user;
    if (!user) {
      return html`<ha-combo-box-item type="button" compact>
        ${item.icon
          ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
          : item.icon_path
            ? html`<ha-svg-icon
                slot="start"
                .path=${item.icon_path}
              ></ha-svg-icon>`
            : nothing}
        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
      </ha-combo-box-item>`;
    }

    return html`
      <ha-combo-box-item type="button" compact>
        <ha-user-badge
          slot="start"
          .hass=${this.hass}
          .user=${item.user}
        ></ha-user-badge>
        <span slot="headline">${item.primary}</span>
      </ha-combo-box-item>
    `;
  };

  private _getUsers = memoizeOne((users?: User[]) => {
    if (!users) {
      return [];
    }

    return users
      .filter((user) => !user.system_generated)
      .map<UserComboBoxItem>((user) => ({
        id: user.id,
        primary: user.name,
        domain_name: user.name,
        search_labels: [user.name, user.id, user.username].filter(
          Boolean
        ) as string[],
        sorting_label: user.name,
        user,
      }));
  });

  private _getItems = () => this._getUsers(this.users);

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder ?? this.hass.localize("ui.components.user-picker.user");

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .notFoundLabel=${this.hass.localize(
          "ui.components.user-picker.no_match"
        )}
        .placeholder=${placeholder}
        .value=${this.value}
        .getItems=${this._getItems}
        .valueRenderer=${this._valueRenderer}
        .rowRenderer=${this._rowRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev) {
    const value = ev.detail.value;

    this.value = value;
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-user-picker": HaUserPicker;
  }
}
