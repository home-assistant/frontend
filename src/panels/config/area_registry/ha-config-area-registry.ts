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
import "@polymer/paper-card/paper-card";
import "@polymer/paper-fab/paper-fab";

import { HomeAssistant } from "../../../types";
import {
  AreaRegistryEntry,
  fetchAreaRegistry,
  updateAreaRegistryEntry,
  deleteAreaRegistryEntry,
  createAreaRegistryEntry,
} from "../../../data/area_registry";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-loading-screen";
import compare from "../../../common/string/compare";
import "../ha-config-section";
import {
  showAreaRegistryDetailDialog,
  loadAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";

class HaConfigAreaRegistry extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  private _items?: AreaRegistryEntry[];

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
      <hass-subpage header="Area Registry">
        <ha-config-section .isWide=${this.isWide}>
          <span slot="header">
            ${this.hass.localize("ui.panel.config.area_registry.picker.header")}
          </span>
          <span slot="introduction">
            Areas are used to organize where devices are. This information will
            be used throughout Home Assistant to help you in organizing your
            interface, permissions and integrations with other systems.
            <p>
              To place devices in an area, navigate to
              <a href="/config/integrations">the integrations page</a> and then
              click on a configured integration to get to the device cards.
            </p>
          </span>
          <paper-card>
            ${this._items.map((entry) => {
              return html`
                <paper-item @click=${this._openEditEntry} .entry=${entry}>
                  <paper-item-body>
                    ${entry.name}
                  </paper-item-body>
                </paper-item>
              `;
            })}
            ${this._items.length === 0
              ? html`
                  <div class="empty">
                    ${this.hass.localize(
                      "ui.panel.config.area_registry.picker.no_areas"
                    )}
                    <paper-button @click=${this._createArea}>
                      ${this.hass.localize(
                        "ui.panel.config.area_registry.picker.create_area"
                      )}
                    </paper-button>
                  </div>
                `
              : html``}
          </paper-card>
        </ha-config-section>
      </hass-subpage>

      <paper-fab
        ?is-wide=${this.isWide}
        icon="hass:plus"
        title="Create Area"
        @click=${this._createArea}
      ></paper-fab>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchData();
    loadAreaRegistryDetailDialog();
  }

  private async _fetchData() {
    this._items = (await fetchAreaRegistry(this.hass!)).sort((ent1, ent2) =>
      compare(ent1.name, ent2.name)
    );
  }

  private _createArea() {
    this._openDialog();
  }

  private _openEditEntry(ev: MouseEvent) {
    const entry: AreaRegistryEntry = (ev.currentTarget! as any).entry;
    this._openDialog(entry);
  }
  private _openDialog(entry?: AreaRegistryEntry) {
    showAreaRegistryDetailDialog(this, {
      entry,
      createEntry: async (values) => {
        const created = await createAreaRegistryEntry(this.hass!, values);
        this._items = this._items!.concat(created).sort((ent1, ent2) =>
          compare(ent1.name, ent2.name)
        );
      },
      updateEntry: async (values) => {
        const updated = await updateAreaRegistryEntry(
          this.hass!,
          entry!.area_id,
          values
        );
        this._items = this._items!.map((ent) =>
          ent === entry ? updated : ent
        );
      },
      removeEntry: async () => {
        if (
          !confirm(`Are you sure you want to delete this area?

All devices in this area will become unassigned.`)
        ) {
          return false;
        }

        try {
          await deleteAreaRegistryEntry(this.hass!, entry!.area_id);
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
        max-width: 600px;
        margin: 16px auto;
      }
      .empty {
        text-align: center;
      }
      paper-item {
        cursor: pointer;
        padding-top: 4px;
        padding-bottom: 4px;
      }
      paper-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
      }

      paper-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }
    `;
  }
}

customElements.define("ha-config-area-registry", HaConfigAreaRegistry);
