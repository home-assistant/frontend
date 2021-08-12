import { mdiPlus } from "@mdi/js";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-svg-icon";
import { deleteUser, fetchUsers, updateUser, User } from "../../../data/user";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showAddUserDialog } from "./show-dialog-add-user";
import { showUserDetailDialog } from "./show-dialog-user-detail";

@customElement("ha-config-users")
export class HaConfigUsers extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public _users: User[] = [];

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  private _columns = memoizeOne(
    (narrow: boolean, _language): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = {
        name: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          width: "25%",
          direction: "asc",
          grows: true,
          template: (name, user: any) =>
            narrow
              ? html` ${name}<br />
                  <div class="secondary">
                    ${user.username} |
                    ${this.hass.localize(`groups.${user.group_ids[0]}`)}
                  </div>`
              : html` ${name ||
                this.hass!.localize(
                  "ui.panel.config.users.editor.unnamed_user"
                )}`,
        },
        username: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.username"
          ),
          sortable: true,
          filterable: true,
          width: "20%",
          direction: "asc",
          hidden: narrow,
          template: (username) => html`
            ${username ||
            this.hass!.localize("ui.panel.config.users.editor.unnamed_user")}
          `,
        },
        group_ids: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.group"
          ),
          sortable: true,
          filterable: true,
          width: "20%",
          direction: "asc",
          hidden: narrow,
          template: (groupIds) => html`
            ${this.hass.localize(`groups.${groupIds[0]}`)}
          `,
        },
        is_active: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.is_active"
          ),
          type: "icon",
          sortable: true,
          filterable: true,
          width: "80px",
          template: (is_active) =>
            is_active ? html`<ha-icon icon="hass:check"> </ha-icon>` : "",
        },
        system_generated: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.system"
          ),
          type: "icon",
          sortable: true,
          filterable: true,
          width: "160px",
          template: (generated) =>
            generated ? html`<ha-icon icon="hass:check"> </ha-icon>` : "",
        },
      };

      return columns;
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
        .columns=${this._columns(this.narrow, this.hass.language)}
        .data=${this._users}
        @row-click=${this._editUser}
        hasFab
        clickable
      >
        <ha-fab
          slot="fab"
          .label=${this.hass.localize("ui.panel.config.users.picker.add_user")}
          extended
          @click=${this._addUser}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _fetchUsers() {
    this._users = await fetchUsers(this.hass);

    this._users.forEach((user) => {
      if (user.is_owner) {
        user.group_ids.unshift("owner");
      }
    });
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
            dismissText: this.hass!.localize("ui.common.cancel"),
            confirmText: this.hass!.localize("ui.common.delete"),
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
          this._users = [...this._users, user];
        }
      },
    });
  }
}
