import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
} from "lit-element";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";

import { HomeAssistant, Route } from "../../../types";
import {
  Person,
  fetchPersons,
  updatePerson,
  deletePerson,
  createPerson,
} from "../../../data/person";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../layouts/hass-tabs-subpage";
import "../../../layouts/hass-loading-screen";
import { compare } from "../../../common/string/compare";
import "../ha-config-section";
import {
  showPersonDetailDialog,
  loadPersonDetailDialog,
} from "./show-dialog-person-detail";
import { User, fetchUsers } from "../../../data/user";
import { configSections } from "../ha-panel-config";

class HaConfigPerson extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public narrow?: boolean;
  @property() public route!: Route;
  @property() private _storageItems?: Person[];
  @property() private _configItems?: Person[];
  private _usersLoad?: Promise<User[]>;

  protected render(): TemplateResult {
    if (
      !this.hass ||
      this._storageItems === undefined ||
      this._configItems === undefined
    ) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }
    const hass = this.hass;
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        .tabs=${configSections[2]}
      >
        <ha-config-section .isWide=${this.isWide}>
          <span slot="header"
            >${hass.localize("ui.panel.config.person.caption")}</span
          >
          <span slot="introduction">
            ${hass.localize("ui.panel.config.person.introduction")}
            ${this._configItems.length > 0
              ? html`
                  <p>
                    ${hass.localize(
                      "ui.panel.config.person.note_about_persons_configured_in_yaml"
                    )}
                  </p>
                `
              : ""}
          </span>
          <ha-card class="storage">
            ${this._storageItems.map((entry) => {
              return html`
                <paper-item @click=${this._openEditEntry} .entry=${entry}>
                  <paper-item-body>
                    ${entry.name}
                  </paper-item-body>
                </paper-item>
              `;
            })}
            ${this._storageItems.length === 0
              ? html`
                  <div class="empty">
                    ${hass.localize(
                      "ui.panel.config.person.no_persons_created_yet"
                    )}
                    <mwc-button @click=${this._createPerson}>
                      ${hass.localize(
                        "ui.panel.config.person.create_person"
                      )}</mwc-button
                    >
                  </div>
                `
              : html``}
          </ha-card>
          ${this._configItems.length > 0
            ? html`
                <ha-card header="Configuration.yaml persons">
                  ${this._configItems.map((entry) => {
                    return html`
                      <paper-item>
                        <paper-item-body>
                          ${entry.name}
                        </paper-item-body>
                      </paper-item>
                    `;
                  })}
                </ha-card>
              `
            : ""}
        </ha-config-section>
      </hass-tabs-subpage>

      <ha-fab
        ?is-wide=${this.isWide}
        ?narrow=${this.narrow}
        icon="hass:plus"
        title="${hass.localize("ui.panel.config.person.add_person")}"
        @click=${this._createPerson}
      ></ha-fab>
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
      compare(ent1.name, ent2.name)
    );
    this._configItems = personData.config.sort((ent1, ent2) =>
      compare(ent1.name, ent2.name)
    );
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
        this._storageItems = this._storageItems!.concat(
          created
        ).sort((ent1, ent2) => compare(ent1.name, ent2.name));
      },
      updateEntry: async (values) => {
        const updated = await updatePerson(this.hass!, entry!.id, values);
        this._storageItems = this._storageItems!.map((ent) =>
          ent === entry ? updated : ent
        );
      },
      removeEntry: async () => {
        if (
          !confirm(`${this.hass!.localize(
            "ui.panel.config.person.confirm_delete"
          )}

${this.hass!.localize("ui.panel.config.person.confirm_delete2")}`)
        ) {
          return false;
        }

        try {
          await deletePerson(this.hass!, entry!.id);
          this._storageItems = this._storageItems!.filter(
            (ent) => ent !== entry
          );
          return true;
        } catch (err) {
          return false;
        }
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
      ha-card {
        max-width: 600px;
        margin: 16px auto;
        overflow: hidden;
      }
      .empty {
        text-align: center;
        padding: 8px;
      }
      paper-item {
        padding-top: 4px;
        padding-bottom: 4px;
      }
      ha-card.storage paper-item {
        cursor: pointer;
      }
      ha-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
      }
      ha-fab[narrow] {
        bottom: 84px;
      }
      ha-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }
    `;
  }
}

customElements.define("ha-config-person", HaConfigPerson);
