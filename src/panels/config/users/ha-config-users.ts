import {
  mdiCancel,
  mdiCodeGreaterThanOrEqual,
  mdiHomeMapMarker,
  mdiPlus,
} from "@mdi/js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../common/translations/localize";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-help-tooltip";
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
    (narrow: boolean, localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<User> = {
        name: {
          title: localize("ui.panel.config.users.picker.headers.name"),
          sortable: true,
          filterable: true,
          width: "25%",
          direction: "asc",
          grows: true,
          template: (name, user) =>
            narrow
              ? html` ${name}<br />
                  <div class="secondary">
                    ${user.username ? `${user.username} |` : ""}
                    ${localize(`groups.${user.group_ids[0]}`)}
                  </div>`
              : html` ${name ||
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
          template: (username) => html` ${username || "-"} `,
        },
        group_ids: {
          title: localize("ui.panel.config.users.picker.headers.group"),
          sortable: true,
          filterable: true,
          width: "20%",
          direction: "asc",
          hidden: narrow,
          template: (groupIds) => html` ${localize(`groups.${groupIds[0]}`)} `,
        },
        icons: {
          title: "",
          sortable: false,
          filterable: false,
          width: "104px",
          template: (_, user) => {
            const icons: [string, string][] = [];
            if (!user.is_active) {
              icons.push([
                mdiCancel,
                localize("ui.panel.config.users.picker.is_not_active"),
              ]);
            }
            if (user.system_generated) {
              icons.push([
                mdiCodeGreaterThanOrEqual,
                localize("ui.panel.config.users.picker.is_system_generated"),
              ]);
            }
            if (user.local_only) {
              icons.push([
                mdiHomeMapMarker,
                localize("ui.panel.config.users.picker.is_local_only"),
              ]);
            }
            return html`${icons.map(
              ([icon, label]) =>
                html`<ha-help-tooltip
                  .iconPath=${icon}
                  .label=${label}
                ></ha-help-tooltip>`
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

  static override styles = css`
    :host {
      --ha-help-tooltip-size: 24px;
      --ha-help-tooltip-color: var(--secondary-text-color);
    }
  `;
}
