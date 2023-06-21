import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { stringCompare } from "../../common/string/compare";
import { fetchUsers, User } from "../../data/user";
import { HomeAssistant } from "../../types";
import "../ha-select";
import "./ha-user-badge";
import "../ha-list-item";

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
      .sort((a, b) =>
        stringCompare(a.name, b.name, this.hass!.locale.language)
      );
  });

  protected render(): TemplateResult {
    return html`
      <ha-select
        .label=${this.label}
        .disabled=${this.disabled}
        .value=${this.value}
        @selected=${this._userChanged}
      >
        ${this.users?.length === 0
          ? html`<mwc-list-item value="">
              ${this.noUserLabel ||
              this.hass?.localize("ui.components.user-picker.no_user")}
            </mwc-list-item>`
          : ""}
        ${this._sortedUsers(this.users).map(
          (user) => html`
            <ha-list-item graphic="avatar" .value=${user.id}>
              <ha-user-badge
                .hass=${this.hass}
                .user=${user}
                slot="graphic"
              ></ha-user-badge>
              ${user.name}
            </ha-list-item>
          `
        )}
      </ha-select>
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
    const newValue = ev.target.value;

    if (newValue !== this.value) {
      this.value = newValue;
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
      mwc-list {
        display: block;
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
