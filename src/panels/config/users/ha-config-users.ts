import { mdiCheck, mdiPlus } from "@mdi/js";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../common/translations/localize";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-icon";
import "../../../components/ha-fab";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-svg-icon";
import {
  computeUserBadges,
  deleteUser,
  fetchUsers,
  updateUser,
  User,
} from "../../../data/user";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showAddUserDialog } from "./show-dialog-add-user";
import { showUserDetailDialog } from "./show-dialog-user-detail";

@customElement("ha-config-users")
export class HaConfigUsers extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public _users: User[] = [];

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  private _columns = memoizeOne(
    (narrow: boolean, localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<User> = {
        name: {
          title: localize("ui.panel.config.users.picker.headers.name"),
          main: true,
          sortable: true,
          filterable: true,
          width: "25%",
          direction: "asc",
          grows: true,
          template: (user) =>
            narrow
              ? html` ${user.name}<br />
                  <div class="secondary">
                    ${user.username ? `${user.username} |` : ""}
                    ${localize(`groups.${user.group_ids[0]}`)}
                  </div>`
              : html` ${user.name ||
                this.hass!.localize(
                  "ui.panel.config.users.editor.unnamed_user"
                )}`,
        },
        username: {
          title: localize("ui.panel.config.users.picker.headers.username"),
          sortable: true,
          filterable: true,
          width: "20%",
          direction: "asc",
          hidden: narrow,
          template: (user) => html`${user.username || "—"}`,
        },
        group_ids: {
          title: localize("ui.panel.config.users.picker.headers.group"),
          sortable: true,
          filterable: true,
          width: "20%",
          direction: "asc",
          hidden: narrow,
          template: (user) => html`
            ${localize(`groups.${user.group_ids[0]}`)}
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
          hidden: narrow,
          template: (user) =>
            user.is_active
              ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
              : "",
        },
        system_generated: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.system"
          ),
          type: "icon",
          sortable: true,
          filterable: true,
          width: "80px",
          hidden: narrow,
          template: (user) =>
            user.system_generated
              ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
              : "",
        },
        local_only: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.local"
          ),
          type: "icon",
          sortable: true,
          filterable: true,
          width: "80px",
          hidden: narrow,
          template: (user) =>
            user.local_only
              ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
              : "",
        },
        icons: {
          title: "",
          label: this.hass.localize(
            "ui.panel.config.users.picker.headers.icon"
          ),
          type: "icon",
          sortable: false,
          filterable: false,
          width: "104px",
          hidden: !narrow,
          template: (user) => {
            const badges = computeUserBadges(this.hass, user, false);
            return html`${badges.map(
              ([icon, tooltip]) =>
                html`<ha-data-table-icon
                  .path=${icon}
                  .tooltip=${tooltip}
                ></ha-data-table-icon>`
            )}`;
          },
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
        .columns=${this._columns(this.narrow, this.hass.localize)}
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
              "ui.panel.config.users.editor.confirm_user_deletion_title",
              "name",
              entry.name
            ),
            text: this.hass!.localize(
              "ui.panel.config.users.editor.confirm_user_deletion_text"
            ),
            dismissText: this.hass!.localize("ui.common.cancel"),
            confirmText: this.hass!.localize("ui.common.delete"),
            destructive: true,
          }))
        ) {
          return false;
        }

        try {
          await deleteUser(this.hass!, entry!.id);
          this._users = this._users!.filter((ent) => ent !== entry);
          return true;
        } catch (err: any) {
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-users": HaConfigUsers;
  }
}
