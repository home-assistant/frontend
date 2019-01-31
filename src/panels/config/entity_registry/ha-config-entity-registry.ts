import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  PropertyDeclarations,
} from "lit-element";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-card/paper-card";

import { HomeAssistant } from "../../../types";
import {
  EntityRegistryEntry,
  fetchEntityRegistry,
  computeEntityRegistryName,
  updateEntityRegistryEntry,
  removeEntityRegistryEntry,
} from "../../../data/entity_registry";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-loading-screen";
import "../../../components/ha-icon";
import compare from "../../../common/string/compare";
import domainIcon from "../../../common/entity/domain_icon";
import stateIcon from "../../../common/entity/state_icon";
import computeDomain from "../../../common/entity/compute_domain";
import "../ha-config-section";
import {
  showEntityRegistryDetailDialog,
  loadEntityRegistryDetailDialog,
} from "./show-dialog-entity-registry-detail";

class HaConfigEntityRegistry extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  private _items?: EntityRegistryEntry[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      _items: {},
    };
  }

  protected render(): TemplateResult | void {
    if (!this.hass || this._items === undefined) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }
    return html`
      <hass-subpage header="Entity Registry">
        <ha-config-section .isWide=${this.isWide}>
          <span slot="header">Entity Registry</span>
          <span slot="introduction">
            Home Assistant keeps a registry of every entity it has ever seen
            that can be uniquely identified. Each of these entities will have an
            entity ID assigned which will be reserved for just this entity.
            <p>
              Use the entity registry to override the name, change the entity ID
              or remove the entry from Home Assistant. Note, removing the entity
              registry entry won't remove the entity. To do that, remove it from
              <a href="/config/integrations">the integrations page</a>.
            </p>
          </span>
          <paper-card>
            ${this._items.map((entry) => {
              const state = this.hass!.states[entry.entity_id];
              return html`
                <paper-icon-item @click=${this._openEditEntry} .entry=${entry}>
                  <ha-icon
                    slot="item-icon"
                    .icon=${state
                      ? stateIcon(state)
                      : domainIcon(computeDomain(entry.entity_id))}
                  ></ha-icon>
                  <paper-item-body two-line>
                    <div class="name">
                      ${computeEntityRegistryName(this.hass!, entry) ||
                        "(unavailable)"}
                    </div>
                    <div class="secondary entity-id">
                      ${entry.entity_id}
                    </div>
                  </paper-item-body>
                  <div class="platform">${entry.platform}</div>
                </paper-icon-item>
              `;
            })}
          </paper-card>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this._fetchData();
    loadEntityRegistryDetailDialog();
  }

  private async _fetchData(): Promise<void> {
    this._items = (await fetchEntityRegistry(this.hass!)).sort((ent1, ent2) =>
      compare(ent1.entity_id, ent2.entity_id)
    );
  }

  private _openEditEntry(ev: MouseEvent): void {
    const entry = (ev.currentTarget! as any).entry;
    showEntityRegistryDetailDialog(this, {
      entry,
      updateEntry: async (updates) => {
        const updated = await updateEntityRegistryEntry(
          this.hass!,
          entry.entity_id,
          updates
        );
        this._items = this._items!.map((ent) =>
          ent === entry ? updated : ent
        );
      },
      removeEntry: async () => {
        if (
          !confirm(`Are you sure you want to delete this entry?

Deleting an entry will not remove the entity from Home Assistant. To do this, you will need to remove the integration "${
            entry.platform
          }" from Home Assistant.`)
        ) {
          return false;
        }

        try {
          await removeEntityRegistryEntry(this.hass!, entry.entity_id);
          this._items = this._items!.filter((ent) => ent !== entry);
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
      paper-card {
        display: block;
      }
      paper-icon-item {
        cursor: pointer;
      }
      ha-icon {
        margin-left: 8px;
      }
    `;
  }
}

customElements.define("ha-config-entity-registry", HaConfigEntityRegistry);
