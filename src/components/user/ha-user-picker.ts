import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-listbox/paper-listbox";
import memoizeOne from "memoize-one";
import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { User, fetchUsers } from "../../data/user";
import { compare } from "../../common/string/compare";

class HaUserPicker extends LitElement {
  public hass?: HomeAssistant;
  @property() public label?: string;
  @property() public value?: string;
  @property() public users?: User[];

  private _sortedUsers = memoizeOne((users?: User[]) => {
    if (!users) {
      return [];
    }

    return users
      .filter((user) => !user.system_generated)
      .sort((a, b) => compare(a.name, b.name));
  });

  protected render(): TemplateResult | void {
    return html`
      <paper-dropdown-menu-light .label=${this.label}>
        <paper-listbox
          slot="dropdown-content"
          .selected=${this._value}
          attr-for-selected="data-user-id"
          @iron-select=${this._userChanged}
        >
          <paper-icon-item data-user-id="">
            No user
          </paper-icon-item>
          ${this._sortedUsers(this.users).map(
            (user) => html`
              <paper-icon-item data-user-id=${user.id}>
                <ha-user-badge .user=${user} slot="item-icon"></ha-user-badge>
                ${user.name}
              </paper-icon-item>
            `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
    `;
  }

  private get _value() {
    return this.value || "";
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (this.users === undefined) {
      fetchUsers(this.hass!).then((users) => {
        this.users = users;
      });
    }
  }

  private _userChanged(ev) {
    const newValue = ev.detail.item.dataset.userId;

    if (newValue !== this._value) {
      this.value = ev.detail.value;
      setTimeout(() => {
        fireEvent(this, "value-changed", { value: newValue });
        fireEvent(this, "change");
      }, 0);
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: inline-block;
      }
      paper-dropdown-menu-light {
        display: block;
      }
      paper-listbox {
        min-width: 200px;
      }
      paper-icon-item {
        cursor: pointer;
      }
    `;
  }
}

customElements.define("ha-user-picker", HaUserPicker);
