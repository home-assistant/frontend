import type { ContextType } from "@lit/context";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import type { TemplateResult, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../common/decorators/consume";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import { apiContext } from "../../data/context";
import type { User } from "../../data/user";
import { fetchUsers } from "../../data/user";
import "../ha-combo-box-item";
import "../ha-generic-picker";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";
import type { PickerValueRenderer } from "../ha-picker-field";
import "./ha-user-badge";

interface UserComboBoxItem extends PickerComboBoxItem {
  user?: User;
}

const SEARCH_KEYS = [
  { name: "primary", weight: 10 },
  { name: "search_labels.username", weight: 6 },
  { name: "id", weight: 3 },
];

@customElement("ha-user-picker")
class HaUserPicker extends LitElement {
  @property() public label?: string;

  @property() public placeholder?: string;

  @property({ attribute: false }) public noUserLabel?: string;

  @property() public value = "";

  @property({ attribute: false }) public users?: User[];

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _loadFailed = false;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    if (!this.users) {
      this._fetchUsers();
    }
  }

  private async _fetchUsers() {
    this._loadFailed = false;

    try {
      this.users = await fetchUsers(this._api.callWS);
    } catch {
      this._loadFailed = true;
    }
  }

  private _retryFetchUsers(ev: Event) {
    ev.stopPropagation();
    this._fetchUsers();
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
      <ha-user-badge slot="start" .user=${user}></ha-user-badge>
      <span slot="headline">${user.name}</span>
    `;
  };

  private _rowRenderer: RenderItemFunction<UserComboBoxItem> = (item) => {
    const user = item.user;
    if (!user) {
      return html`<ha-combo-box-item>
        ${
          item.icon
            ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
            : item.icon_path
              ? html`<ha-svg-icon
                  slot="start"
                  .path=${item.icon_path}
                ></ha-svg-icon>`
              : nothing
        }
        <span slot="headline">${item.primary}</span>
        ${
          item.secondary
            ? html`<span slot="supporting-text">${item.secondary}</span>`
            : nothing
        }
      </ha-combo-box-item>`;
    }

    return html`
      <ha-combo-box-item>
        <ha-user-badge slot="start" .user=${item.user}></ha-user-badge>
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
        search_labels: { username: user.username },
        sorting_label: user.name,
        user,
      }));
  });

  private _getItems = () => this._getUsers(this.users);

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder ?? this._localize("ui.components.user-picker.user");

    return html`
      <ha-generic-picker
        .autofocus=${this.autofocus}
        .label=${this.label}
        .placeholder=${placeholder}
        .value=${this.value}
        .notFoundLabel=${this._notFoundLabel}
        .getItems=${this._getItems}
        .valueRenderer=${this._valueRenderer}
        .rowRenderer=${this._rowRenderer}
        .loading=${!this._loadFailed && this.users === undefined}
        .loadError=${
          this._loadFailed
            ? this._localize("ui.components.user-picker.load_failed")
            : undefined
        }
        .searchKeys=${SEARCH_KEYS}
        .unknownItemText=${this._localize("ui.components.user-picker.unknown")}
        @value-changed=${this._valueChanged}
        @picker-retry=${this._retryFetchUsers}
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

  private _notFoundLabel = (search: string) =>
    this._localize("ui.components.user-picker.no_match", {
      term: html`<b>‘${search}’</b>`,
    });
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-user-picker": HaUserPicker;
  }
}
