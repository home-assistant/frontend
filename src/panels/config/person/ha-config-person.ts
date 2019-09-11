import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  PropertyDeclarations,
} from "lit-element";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";

import { HomeAssistant } from "../../../types";
import {
  Person,
  fetchPersons,
  updatePerson,
  deletePerson,
  createPerson,
} from "../../../data/person";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-loading-screen";
import { compare } from "../../../common/string/compare";
import "../ha-config-section";
import {
  showPersonDetailDialog,
  loadPersonDetailDialog,
} from "./show-dialog-person-detail";
import { User, fetchUsers } from "../../../data/user";

class HaConfigPerson extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  private _storageItems?: Person[];
  private _configItems?: Person[];
  private _usersLoad?: Promise<User[]>;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      _storageItems: {},
      _configItems: {},
    };
  }

  protected render(): TemplateResult | void {
    if (
      !this.hass ||
      this._storageItems === undefined ||
      this._configItems === undefined
    ) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }
    return html`
      <hass-subpage header="Persons">
        <ha-config-section .isWide=${this.isWide}>
          <span slot="header">Persons</span>
          <span slot="introduction">
            Here you can define each person of interest in Home Assistant.
            ${this._configItems.length > 0
              ? html`
                  <p>
                    Note: persons configured via configuration.yaml cannot be
                    edited via the UI.
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
                    Looks like you have not created any persons yet.
                    <mwc-button @click=${this._createPerson}>
                      CREATE PERSON</mwc-button
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
      </hass-subpage>

      <ha-fab
        ?is-wide=${this.isWide}
        icon="hass:plus"
        title="Add Person"
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
        this._storageItems = this._storageItems!.concat(created).sort(
          (ent1, ent2) => compare(ent1.name, ent2.name)
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
          !confirm(`Are you sure you want to delete this person?

All devices belonging to this person will become unassigned.`)
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

      ha-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }
    `;
  }
}

customElements.define("ha-config-person", HaConfigPerson);
