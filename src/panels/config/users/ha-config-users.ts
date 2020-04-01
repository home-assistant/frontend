import "../../../layouts/hass-tabs-subpage-data-table";
import "../../../components/ha-fab";

import { computeRTL } from "../../../common/util/compute_rtl";
import { configSections } from "../ha-panel-config";
import {
  LitElement,
  property,
  css,
  PropertyValues,
  customElement,
} from "lit-element";
import { HomeAssistant, Route } from "../../../types";
import { html } from "lit-html";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { User, fetchUsers, updateUser, deleteUser } from "../../../data/user";
import memoizeOne from "memoize-one";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import { showUserDetailDialog } from "./show-dialog-user-detail";
import { showAddUserDialog } from "./show-dialog-add-user";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";

@customElement("ha-config-users")
export class HaConfigUsers extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public _users: User[] = [];
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;

  private _columns = memoizeOne(
    (_language): DataTableColumnContainer => {
      return {
        name: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: (name) => html`
            ${name ||
              this.hass!.localize("ui.panel.config.users.editor.unnamed_user")}
          `,
        },
        group_ids: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.group"
          ),
          sortable: true,
          filterable: true,
          width: "25%",
          template: (groupIds) => html`
            ${this.hass.localize(`groups.${groupIds[0]}`)}
          `,
        },
        system_generated: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.system"
          ),
          type: "icon",
          width: "10%",
          sortable: true,
          filterable: true,
          template: (generated) => html`
            ${generated
              ? html`
                  <ha-icon icon="hass:check-circle-outline"></ha-icon>
                `
              : ""}
          `,
        },
      };
    }
  );

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._fetchUsers();
  }

  protected render() {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        backPath="/config"
        .tabs=${configSections.persons}
        .columns=${this._columns(this.hass.language)}
        .data=${this._users}
        @row-click=${this._editUser}
      >
      </hass-tabs-subpage-data-table>
      <ha-fab
        ?is-wide=${this.isWide}
        ?narrow=${this.narrow}
        icon="hass:plus"
        .title=${this.hass.localize("ui.panel.config.users.picker.add_user")}
        @click=${this._addUser}
        ?rtl=${computeRTL(this.hass)}
      ></ha-fab>
    `;
  }

  private async _fetchUsers() {
    this._users = await fetchUsers(this.hass);
  }

  private _editUser(ev: HASSDomEvent<RowClickedEvent>) {
    const id = ev.detail.id;
    const entry = this._users.find((user) => user.id === id);

    if (!entry) {
      return;
    }

    showUserDetailDialog(this, {
      entry,
      updateEntry: async (values) => {
        const updated = await updateUser(this.hass!, entry!.id, values);
        this._users = this._users!.map((ent) =>
          ent === entry ? updated.user : ent
        );
      },
      removeEntry: async () => {
        if (
          !(await showConfirmationDialog(this, {
            title: this.hass!.localize(
              "ui.panel.config.users.editor.confirm_user_deletion",
              "name",
              entry.name
            ),
            dismissText: this.hass!.localize("ui.common.no"),
            confirmText: this.hass!.localize("ui.common.yes"),
          }))
        ) {
          return false;
        }

        try {
          await deleteUser(this.hass!, entry!.id);
          this._users = this._users!.filter((ent) => ent !== entry);
          return true;
        } catch (err) {
          return false;
        }
      },
    });
  }

  private _addUser() {
    showAddUserDialog(this, {
      userAddedCallback: async (user: User) => {
        if (user) {
          this._users = { ...this._users, ...user };
        }
      },
    });
  }

  static get styles() {
    return css`
      ha-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
      }
      ha-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }
      ha-fab[rtl] {
        right: auto;
        left: 16px;
      }
      ha-fab[narrow] {
        bottom: 84px;
      }
      ha-fab[rtl][is-wide] {
        bottom: 24px;
        right: auto;
        left: 24px;
      }
    `;
  }
}
