import { mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
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
import { fetchUsers } from "../../../data/user";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import {
  loadPersonDetailDialog,
  showPersonDetailDialog,
} from "./show-dialog-person-detail";

@customElement("ha-config-person")
export class HaConfigPerson extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _storageItems?: Person[];

  @state() private _configItems?: Person[];

  private _usersLoad?: Promise<User[]>;

  protected render() {
    if (
      !this.hass ||
      this._storageItems === undefined ||
      this._configItems === undefined
    ) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }
    const hass = this.hass;
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        .tabs=${configSections.persons}
        has-fab
      >
        <ha-config-section .isWide=${this.isWide}>
          <span slot="header"
            >${hass.localize("ui.panel.config.person.caption")}</span
          >
          <span slot="introduction">
            <p>${hass.localize("ui.panel.config.person.introduction")}</p>
            ${this._configItems.length > 0
              ? html`
                  <p>
                    ${hass.localize(
                      "ui.panel.config.person.note_about_persons_configured_in_yaml"
                    )}
                  </p>
                `
              : ""}

            <a
              href=${documentationUrl(this.hass, "/integrations/person/")}
              target="_blank"
              rel="noreferrer"
            >
              ${this.hass.localize("ui.panel.config.person.learn_more")}
            </a>
          </span>

          <ha-card outlined class="storage">
            <ha-list>
              ${this._storageItems.map(
                (entry) => html`
                  <ha-list-item
                    graphic="avatar"
                    @click=${this._openEditEntry}
                    .entry=${entry}
                  >
                    <ha-person-badge
                      .hass=${this.hass}
                      .person=${entry}
                      slot="graphic"
                    ></ha-person-badge>
                    <span>${entry.name}</span>
                  </ha-list-item>
                `
              )}
            </ha-list>
            ${this._storageItems.length === 0
              ? html`
                  <div class="empty">
                    ${hass.localize(
                      "ui.panel.config.person.no_persons_created_yet"
                    )}
                    <ha-button
                      @click=${this._createPerson}
                      appearance="filled"
                      size="small"
                      reduce-left-padding
                    >
                      <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                      ${hass.localize(
                        "ui.panel.config.person.create_person"
                      )}</ha-button
                    >
                  </div>
                `
              : nothing}
          </ha-card>
          ${this._configItems.length > 0
            ? html`
                <ha-card outlined header="Configuration.yaml persons">
                  <ha-list>
                    ${this._configItems.map(
                      (entry) => html`
                        <ha-list-item graphic="avatar">
                          <ha-person-badge
                            .hass=${this.hass}
                            .person=${entry}
                            slot="graphic"
                          ></ha-person-badge>
                          <span>${entry.name}</span>
                        </ha-list-item>
                      `
                    )}
                  </ha-list>
                </ha-card>
              `
            : nothing}
        </ha-config-section>
        <ha-fab
          slot="fab"
          .label=${hass.localize("ui.panel.config.person.add_person")}
          extended
          @click=${this._createPerson}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchData();
    loadPersonDetailDialog();
  }

  private async _fetchData() {
    this._usersLoad = fetchUsers(this.hass!);
    const personData = await fetchPersons(this.hass!);

    this._storageItems = personData.storage.sort((ent1, ent2) =>
      stringCompare(ent1.name, ent2.name, this.hass!.locale.language)
    );
    this._configItems = personData.config.sort((ent1, ent2) =>
      stringCompare(ent1.name, ent2.name, this.hass!.locale.language)
    );
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
      this._openDialog(personToEdit);
    } else {
      showAlertDialog(this, {
        title: this.hass?.localize(
          "ui.panel.config.person.person_not_found_title"
        ),
        text: this.hass?.localize("ui.panel.config.person.person_not_found"),
      });
    }
  }

  private _createPerson() {
    this._openDialog();
  }

  private _openEditEntry(ev: MouseEvent) {
    const entry: Person = (ev.currentTarget! as any).entry;
    this._openDialog(entry);
  }

  private _allowedUsers(users: User[], currentPerson?: Person) {
    const used = new Set();
    for (const coll of [this._configItems, this._storageItems]) {
      for (const pers of coll!) {
        if (pers.user_id) {
          used.add(pers.user_id);
        }
      }
    }
    const currentUserId = currentPerson ? currentPerson.user_id : undefined;
    return users.filter(
      (user) => user.id === currentUserId || !used.has(user.id)
    );
  }

  private async _openDialog(entry?: Person) {
    const users = await this._usersLoad!;

    showPersonDetailDialog(this, {
      entry,
      users: this._allowedUsers(users, entry),
      createEntry: async (values) => {
        const created = await createPerson(this.hass!, values);
        this._storageItems = this._storageItems!.concat(created).sort(
          (ent1, ent2) =>
            stringCompare(ent1.name, ent2.name, this.hass!.locale.language)
        );
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
      refreshUsers: () => {
        this._usersLoad = fetchUsers(this.hass!);
      },
    });
  }

  static styles = css`
    a {
      color: var(--primary-color);
    }
    ha-card {
      max-width: 600px;
      margin: 16px auto;
      overflow: hidden;
    }
    .empty {
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: space-around;
    }
    ha-list:has(+ .empty) {
      display: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-person": HaConfigPerson;
  }
}
