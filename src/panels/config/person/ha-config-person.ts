import { mdiAccount, mdiCheck, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../common/decorators/storage";
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
import "../../../components/user/ha-person-badge";
import type { Person } from "../../../data/person";
import {
  createPerson,
  deletePerson,
  fetchPersons,
  updatePerson,
} from "../../../data/person";
import type { User } from "../../../data/user";
import {
  computeUserBadges,
  deleteUser,
  fetchUsers,
  updateUser,
} from "../../../data/user";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showUserDetailDialog } from "../users/show-dialog-user-detail";
import {
  loadPersonDetailDialog,
  showPersonDetailDialog,
} from "./show-dialog-person-detail";

interface PersonUserRow {
  id: string;
  name: string;
  username: string | null;
  group: string;
  is_active: boolean | undefined;
  local_only: boolean | undefined;
  is_owner: boolean;
  person?: Person;
  user?: User;
}

@customElement("ha-config-person")
export class HaConfigPerson extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _storageItems?: Person[];

  @state() private _configItems?: Person[];

  @state() private _users: User[] = [];

  @storage({ key: "people-table-sort", state: false, subscribe: false })
  private _activeSorting?: SortingChangedEvent;

  @storage({ key: "people-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string;

  @storage({
    key: "people-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "people-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  @storage({
    storage: "sessionStorage",
    key: "people-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  @storage({
    key: "people-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  private _columns = memoizeOne(
    (
      narrow: boolean,
      localize: LocalizeFunc
    ): DataTableColumnContainer<PersonUserRow> => ({
      icon: {
        title: "",
        label: localize("ui.panel.config.users.picker.headers.icon"),
        type: "icon",
        moveable: false,
        showNarrow: true,
        template: (row) =>
          row.person
            ? html`<ha-person-badge
                .hass=${this.hass}
                .person=${row.person}
              ></ha-person-badge>`
            : html`<ha-svg-icon .path=${mdiAccount}></ha-svg-icon>`,
      },
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
        template: (row) => html`${row.username || "—"}`,
      },
      group: {
        title: localize("ui.panel.config.users.picker.headers.group"),
        sortable: true,
        filterable: true,
        groupable: true,
      },
      is_active: {
        title: localize("ui.panel.config.users.picker.headers.is_active"),
        sortable: true,
        filterable: true,
        hidden: narrow,
        template: (row) =>
          row.is_active === undefined
            ? "—"
            : html`<span
                style="display: flex; align-items: center; gap: 8px"
              >
                <span
                  style="width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background-color: var(${row.is_active ? "--success-color" : "--error-color"})"
                ></span>
                ${row.is_active
                  ? localize(
                      "ui.panel.config.users.picker.status.active"
                    )
                  : localize(
                      "ui.panel.config.users.picker.status.inactive"
                    )}
              </span>`,
      },
      local_only: {
        title: localize("ui.panel.config.users.picker.headers.local"),
        type: "icon",
        minWidth: "80px",
        sortable: true,
        filterable: true,
        hidden: narrow,
        template: (row) =>
          row.local_only
            ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
            : "",
      },
      icons: {
        title: "",
        label: localize("ui.panel.config.users.picker.headers.icon"),
        type: "icon",
        sortable: false,
        filterable: false,
        minWidth: "104px",
        hidden: !narrow,
        showNarrow: true,
        template: (row) => {
          if (!row.user) {
            return "";
          }
          const badges = computeUserBadges(this.hass, row.user, false);
          return html`${badges.map(
            ([icon, tooltip]) =>
              html`<ha-data-table-icon
                .path=${icon}
                .tooltip=${tooltip}
              ></ha-data-table-icon>`
          )}`;
        },
      },
    })
  );

  private _mergedData = memoizeOne(
    (
      storageItems: Person[] | undefined,
      configItems: Person[] | undefined,
      users: User[],
      localize: LocalizeFunc
    ): PersonUserRow[] => {
      if (!storageItems || !configItems) {
        return [];
      }

      const nonSystemUsers = users.filter((u) => !u.system_generated);
      const userMap = new Map<string, User>();
      for (const user of nonSystemUsers) {
        userMap.set(user.id, user);
      }

      const personUserIds = new Set<string>();
      const rows: PersonUserRow[] = [];

      // Add all persons (storage + config)
      for (const person of [...storageItems, ...configItems]) {
        const user = person.user_id ? userMap.get(person.user_id) : undefined;
        if (person.user_id) {
          personUserIds.add(person.user_id);
        }
        rows.push({
          id: person.id,
          name: person.name,
          username: user?.username || null,
          group: user ? localize(`groups.${user.group_ids[0]}`) : "—",
          is_active: user?.is_active,
          local_only: user?.local_only,
          is_owner: user?.is_owner ?? false,
          person,
          user,
        });
      }

      // Add orphan users (non-system users not linked to any person)
      for (const user of nonSystemUsers) {
        if (!personUserIds.has(user.id)) {
          rows.push({
            id: user.id,
            name:
              user.name ||
              localize("ui.panel.config.users.editor.unnamed_user"),
            username: user.username,
            group: localize(`groups.${user.group_ids[0]}`),
            is_active: user.is_active,
            local_only: user.local_only,
            is_owner: user.is_owner,
            user,
          });
        }
      }

      return rows;
    }
  );

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._fetchData();
    loadPersonDetailDialog();
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
        .data=${this._mergedData(
          this._storageItems,
          this._configItems,
          this._users,
          this.hass.localize
        )}
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
        @row-click=${this._handleRowClick}
        has-fab
        clickable
      >
        <ha-fab
          slot="fab"
          .label=${this.hass.localize("ui.panel.config.person.add_person")}
          extended
          @click=${this._createPerson}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _fetchData() {
    const [personData, users] = await Promise.all([
      fetchPersons(this.hass!),
      fetchUsers(this.hass!),
    ]);

    this._storageItems = personData.storage;
    this._configItems = personData.config;

    users.forEach((user) => {
      if (user.is_owner) {
        user.group_ids.unshift("owner");
      }
    });
    this._users = users;

    this._openDialogIfPersonSpecifiedInRoute();
  }

  private _openDialogIfPersonSpecifiedInRoute() {
    if (!this.route.path.includes("/edit/")) {
      return;
    }

    const routeSegments = this.route.path.split("/edit/");
    const personId = routeSegments.length > 1 ? routeSegments[1] : null;
    if (!personId) {
      return;
    }

    const personToEdit = this._storageItems!.find((p) => p.id === personId);
    if (personToEdit) {
      this._openPersonDialog(personToEdit);
    } else {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.person.person_not_found_title"
        ),
        text: this.hass.localize("ui.panel.config.person.person_not_found"),
      });
    }
  }

  private _handleRowClick(ev: HASSDomEvent<RowClickedEvent>) {
    const id = ev.detail.id;
    const data = this._mergedData(
      this._storageItems,
      this._configItems,
      this._users,
      this.hass.localize
    );
    const row = data.find((r) => r.id === id);

    if (!row) {
      return;
    }

    if (row.person) {
      this._openPersonDialog(row.person);
    } else if (row.user) {
      this._openOrphanUserDialog(row.user);
    }
  }

  private _allowedUsers(currentPerson?: Person) {
    const used = new Set<string>();
    for (const coll of [this._configItems, this._storageItems]) {
      for (const pers of coll!) {
        if (pers.user_id) {
          used.add(pers.user_id);
        }
      }
    }
    const currentUserId = currentPerson ? currentPerson.user_id : undefined;
    return this._users.filter(
      (user) => user.id === currentUserId || !used.has(user.id)
    );
  }

  private _createPerson() {
    this._openPersonDialog();
  }

  private _openPersonDialog(entry?: Person) {
    showPersonDetailDialog(this, {
      entry,
      users: this._allowedUsers(entry),
      createEntry: async (values) => {
        const created = await createPerson(this.hass!, values);
        this._storageItems = [...this._storageItems!, created];
      },
      updateEntry: async (values) => {
        const updated = await updatePerson(this.hass!, entry!.id, values);
        this._storageItems = this._storageItems!.map((ent) =>
          ent === entry ? updated : ent
        );
      },
      removeEntry: async () => {
        if (
          !(await showConfirmationDialog(this, {
            title: this.hass!.localize(
              "ui.panel.config.person.confirm_delete_title",
              { name: entry!.name }
            ),
            text: this.hass!.localize(
              "ui.panel.config.person.confirm_delete_text"
            ),
            dismissText: this.hass!.localize("ui.common.cancel"),
            confirmText: this.hass!.localize("ui.common.delete"),
            destructive: true,
          }))
        ) {
          return false;
        }

        try {
          await deletePerson(this.hass!, entry!.id);
          this._storageItems = this._storageItems!.filter(
            (ent) => ent !== entry
          );
          return true;
        } catch (_err: any) {
          return false;
        }
      },
      refreshUsers: async () => {
        this._users = await fetchUsers(this.hass!);
        this._users.forEach((user) => {
          if (user.is_owner) {
            user.group_ids.unshift("owner");
          }
        });
      },
    });
  }

  private _openOrphanUserDialog(entry: User) {
    showUserDetailDialog(this, {
      entry,
      replaceEntry: (newEntry: User) => {
        this._users = this._users.map((ent) =>
          ent.id === newEntry.id ? newEntry : ent
        );
      },
      updateEntry: async (values) => {
        const updated = await updateUser(this.hass!, entry.id, values);
        this._users = this._users.map((ent) =>
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
          await deleteUser(this.hass!, entry.id);
          this._users = this._users.filter((ent) => ent !== entry);
          return true;
        } catch (_err: any) {
          return false;
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

  static styles = css`
    ha-person-badge {
      width: var(--ha-space-8);
      height: var(--ha-space-8);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-person": HaConfigPerson;
  }
}
