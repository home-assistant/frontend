import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { stringCompare } from "../../common/string/compare";
import {
  fuzzyFilterSort,
  ScorableTextItem,
} from "../../common/string/filter/sequence-matching";
import { fetchUsers, User } from "../../data/user";
import { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-list-item";
import "../ha-select";
import "./ha-user-badge";

type ScorableUser = ScorableTextItem & User;

class HaUserPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ attribute: false }) public users?: User[];

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  @state() private _opened?: boolean;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  @property({ type: Boolean, attribute: "include-system" })
  public includeSystem?: boolean;

  private _init = false;

  private _getUserItems = memoizeOne(
    (users: User[] | undefined): ScorableUser[] => {
      if (!users) {
        return [];
      }

      return users
        .sort((a, b) =>
          stringCompare(a.name, b.name, this.hass!.locale.language)
        )
        .map((user) => ({
          ...user,
          strings: [user.name, ...(user.username ? [user.username] : [])],
        }));
    }
  );

  private _filteredUsers = memoizeOne(
    (users: User[], includeSystem?: boolean) =>
      users.filter((user) => includeSystem || !user.system_generated)
  );

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (this.users === undefined) {
      fetchUsers(this.hass!).then((users) => {
        this.users = users;
      });
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (
      (!this._init && this.users) ||
      (this._init && changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      const filteredUsers = this._filteredUsers(
        this.users ?? [],
        this.includeSystem
      );
      const items = this._getUserItems(filteredUsers);

      this.comboBox.items = items;
      this.comboBox.filteredItems = items;
    }
  }

  private _rowRenderer: ComboBoxLitRenderer<User> = (item) => html`
    <ha-list-item
      graphic="avatar"
      .value=${item.id}
      .twoline=${!!item.username}
    >
      <ha-user-badge
        .hass=${this.hass}
        .user=${item}
        slot="graphic"
      ></ha-user-badge>
      ${item.name}
      <span slot="secondary">${item.username}</span>
    </ha-list-item>
  `;

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.user-picker.user")
          : this.label}
        .value=${this._value}
        .helper=${this.helper}
        .renderer=${this._rowRenderer}
        .disabled=${this.disabled}
        .required=${this.required}
        item-id-path="id"
        item-value-path="id"
        item-label-path="name"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        @filter-changed=${this._filterChanged}
      >
      </ha-combo-box>
    `;
  }

  private _filterChanged(ev: CustomEvent): void {
    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value.toLowerCase();
    target.filteredItems = filterString.length
      ? fuzzyFilterSort<ScorableUser>(filterString, target.items || [])
      : target.items;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;

    if (newValue === "no_users") {
      newValue = "";
    }

    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private get _value() {
    return this.value || "";
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-select {
        width: 100%;
      }
    `;
  }
}

customElements.define("ha-user-picker", HaUserPicker);

declare global {
  interface HTMLElementTagNameMap {
    "ha-user-picker": HaUserPicker;
  }
}
