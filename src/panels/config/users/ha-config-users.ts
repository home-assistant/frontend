import { mdiCheck, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-icon";
import "../../../components/ha-fab";
import "../../../components/ha-svg-icon";
import type { User } from "../../../data/user";
import {
  computeUserBadges,
  deleteUser,
  fetchUsers,
  updateUser,
} from "../../../data/user";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showAddUserDialog } from "./show-dialog-add-user";
import { showUserDetailDialog } from "./show-dialog-user-detail";
import { storage } from "../../../common/decorators/storage";

@customElement("ha-config-users")
export class HaConfigUsers extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _users: User[] = [];

  @storage({ key: "users-table-sort", state: false, subscribe: false })
  private _activeSorting?: SortingChangedEvent;

  @storage({ key: "users-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string;

  @storage({
    key: "users-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "users-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  @storage({
    storage: "sessionStorage",
    key: "users-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  @storage({
    key: "users-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  private _columns = memoizeOne(
    (narrow: boolean, localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<User> = {
        name: {
          title: localize("ui.panel.config.users.picker.headers.name"),
          main: true,
          sortable: true,
          filterable: true,
          direction: "asc",
          flex: 2,
        },
        username: {
          title: localize("ui.panel.config.users.picker.headers.username"),
          sortable: true,
          filterable: true,
          direction: "asc",
          template: (user) => html`${user.username || "—"}`,
        },
        group: {
          title: localize("ui.panel.config.users.picker.headers.group"),
          sortable: true,
          filterable: true,
          groupable: true,
          direction: "asc",
        },
        is_active: {
          title: this.hass.localize(
            "ui.panel.config.users.picker.headers.is_active"
          ),
          type: "icon",
          sortable: true,
          filterable: true,
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
          minWidth: "104px",
          hidden: !narrow,
          showNarrow: true,
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
        back-path="/config"
        .tabs=${configSections.persons}
        .columns=${this._columns(this.narrow, this.hass.localize)}
        .data=${this._userData(this._users, this.hass.localize)}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._activeSorting}
        @sorting-changed=${this._handleSortingChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._editUser}
        has-fab
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

  private _userData = memoizeOne((users: User[], localize: LocalizeFunc) =>
    users.map((user) => ({
      ...user,
      name: user.name || localize("ui.panel.config.users.editor.unnamed_user"),
      group: localize(`groups.${user.group_ids[0]}`),
    }))
  );

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
      replaceEntry: (newEntry: User) => {
        this._users = this._users!.map((ent) =>
          ent.id === newEntry.id ? newEntry : ent
        );
      },
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
              { name: entry.name }
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
        } catch (_err: any) {
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

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-users": HaConfigUsers;
  }
}
