import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { stringCompare } from "../../common/string/compare";
import { fetchUsers, User } from "../../data/user";
import { HomeAssistant } from "../../types";
import "../ha-icon-button";
import "./ha-user-badge";

class HaUserPicker extends LitElement {
  public hass?: HomeAssistant;

  @property() public label?: string;

  @property() public noUserLabel?: string;

  @property() public value = "";

  @property() public users?: User[];

  @property({ type: Boolean }) public disabled = false;

  private _sortedUsers = memoizeOne((users?: User[]) => {
    if (!users) {
      return [];
    }

    return users
      .filter((user) => !user.system_generated)
      .sort((a, b) => stringCompare(a.name, b.name));
  });

  protected render(): TemplateResult {
    return html`
      <paper-dropdown-menu-light
        .label=${this.label}
        .disabled=${this.disabled}
      >
        <paper-listbox
          slot="dropdown-content"
          .selected=${this.value}
          attr-for-selected="data-user-id"
          @iron-select=${this._userChanged}
        >
          <paper-icon-item data-user-id="">
            ${this.noUserLabel ||
            this.hass?.localize("ui.components.user-picker.no_user")}
          </paper-icon-item>
          ${this._sortedUsers(this.users).map(
            (user) => html`
              <paper-icon-item data-user-id=${user.id}>
                <ha-user-badge
                  .hass=${this.hass}
                  .user=${user}
                  slot="item-icon"
                ></ha-user-badge>
                ${user.name}
              </paper-icon-item>
            `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
    `;
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

    if (newValue !== this.value) {
      this.value = ev.detail.value;
      setTimeout(() => {
        fireEvent(this, "value-changed", { value: newValue });
        fireEvent(this, "change");
      }, 0);
    }
  }

  static get styles(): CSSResultGroup {
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-user-picker": HaUserPicker;
  }
}
