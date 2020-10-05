import "@material/mwc-fab";
import { mdiPlus } from "@mdi/js";
import {
  customElement,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import { html } from "lit-html";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
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
          width: "30%",
          template: (groupIds) => html`
            ${this.hass.localize(`groups.${groupIds[0]}`)}
          `,
        },
        system_generated: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.system"
          ),
          type: "icon",
          width: "80px",
          sortable: true,
          filterable: true,
          template: (generated) => html`
            ${generated
              ? html` <ha-icon icon="hass:check-circle-outline"></ha-icon> `
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
        hasFab
      >
        <mwc-fab
          slot="fab"
          .title=${this.hass.localize("ui.panel.config.users.picker.add_user")}
          @click=${this._addUser}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </mwc-fab>
      </hass-tabs-subpage-data-table>
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
          this._users = [...this._users, user];
        }
      },
    });
  }
}
