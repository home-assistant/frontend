import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
  customElement,
  query,
} from "lit-element";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";

import "../../../components/map/ha-locations-editor";

import { HomeAssistant } from "../../../types";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-loading-screen";
import { compare } from "../../../common/string/compare";
import "../ha-config-section";
import { showZoneDetailDialog } from "./show-dialog-zone-detail";
import {
  Zone,
  fetchZones,
  createZone,
  updateZone,
  deleteZone,
  ZoneMutableParams,
} from "../../../data/zone";
// tslint:disable-next-line
import { HaLocationsEditor } from "../../../components/map/ha-locations-editor";

@customElement("ha-config-zone")
export class HaConfigZone extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public narrow?: boolean;
  @property() private _storageItems?: Zone[];
  @property() private _activeEntry: string = "";
  @query("ha-locations-editor") private _map?: HaLocationsEditor;

  protected render(): TemplateResult | void {
    if (!this.hass || this._storageItems === undefined) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }
    const hass = this.hass;
    const listBox = html`
      <paper-listbox
        attr-for-selected="data-id"
        .selected=${this._activeEntry || ""}
      >
        ${this._storageItems.map((entry) => {
          return html`
      <paper-icon-item data-id=${entry.id} @click=${
            this._itemClicked
          } .entry=${entry}>
        <ha-icon
          .icon=${entry.icon}
          slot="item-icon"
        >
        </ha-icon>
        <paper-item-body>
          ${entry.name}
        </paper-item-body>
        ${
          !this.narrow
            ? html`
                <paper-icon-button
                  icon="hass:information-outline"
                  .entry=${entry}
                  @click=${this._openEditEntry}
                ></paper-icon-button>
              `
            : ""
        }
        </ha-icon>
      </paper-icon-item>
    `;
        })}
      </paper-listbox>
      ${this._storageItems.length === 0
        ? html`
            <div class="empty">
              ${hass.localize("ui.panel.config.zone.no_zones_created_yet")}
              <mwc-button @click=${this._createZone}>
                ${hass.localize("ui.panel.config.zone.create_zone")}</mwc-button
              >
            </div>
          `
        : html``}
    `;

    return html`
      <hass-subpage
        .header=${hass.localize("ui.panel.config.zone.caption")}
        .showBackButton=${!this.isWide}
      >
        ${this.narrow
          ? html`
              <ha-config-section .isWide=${this.isWide}>
                <span slot="introduction">
                  ${hass.localize("ui.panel.config.zone.introduction")}
                </span>
                <ha-card>${listBox}</ha-card>
              </ha-config-section>
            `
          : ""}
        ${!this.narrow
          ? html`
              <div class="flex">
                <ha-locations-editor
                  .locations=${this._storageItems}
                  @location-updated=${this._locationUpdated}
                  @radius-updated=${this._radiusUpdated}
                  @marker-clicked=${this._markerClicked}
                ></ha-locations-editor>
                ${listBox}
              </div>
            `
          : ""}
      </hass-subpage>

      <ha-fab
        ?is-wide=${this.isWide}
        icon="hass:plus"
        title="${hass.localize("ui.panel.config.zone.add_zone")}"
        @click=${this._createZone}
      ></ha-fab>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchData();
  }

  private async _fetchData() {
    this._storageItems = (await fetchZones(this.hass!)).sort((ent1, ent2) =>
      compare(ent1.name, ent2.name)
    );
  }

  private _locationUpdated(ev: CustomEvent) {
    this._activeEntry = ev.detail.id;
    const entry = this._storageItems!.find((item) => item.id === ev.detail.id);
    if (!entry) {
      return;
    }
    this._updateEntry(entry, {
      latitude: ev.detail.location[0],
      longitude: ev.detail.location[1],
    });
  }

  private _radiusUpdated(ev: CustomEvent) {
    this._activeEntry = ev.detail.id;
    const entry = this._storageItems!.find((item) => item.id === ev.detail.id);
    if (!entry) {
      return;
    }
    this._updateEntry(entry, {
      radius: ev.detail.radius,
    });
  }

  private _markerClicked(ev: CustomEvent) {
    this._activeEntry = ev.detail.id;
  }

  private _createZone() {
    this._openDialog();
  }

  private _itemClicked(ev: MouseEvent) {
    if (this.narrow) {
      this._openEditEntry(ev);
      return;
    }

    const entry: Zone = (ev.currentTarget! as any).entry;
    this._map?.fitMarker(entry.id);
  }

  private _openEditEntry(ev: MouseEvent) {
    const entry: Zone = (ev.currentTarget! as any).entry;
    this._openDialog(entry);
  }

  private async _createEntry(values: ZoneMutableParams) {
    const created = await createZone(this.hass!, values);
    this._storageItems = this._storageItems!.concat(
      created
    ).sort((ent1, ent2) => compare(ent1.name, ent2.name));
  }

  private async _updateEntry(entry: Zone, values: Partial<ZoneMutableParams>) {
    const updated = await updateZone(this.hass!, entry!.id, values);
    this._storageItems = this._storageItems!.map((ent) =>
      ent === entry ? updated : ent
    );
  }

  private async _removeEntry(entry: Zone) {
    if (
      !confirm(`${this.hass!.localize("ui.panel.config.zone.confirm_delete")}

${this.hass!.localize("ui.panel.config.zone.confirm_delete2")}`)
    ) {
      return false;
    }

    try {
      await deleteZone(this.hass!, entry!.id);
      this._storageItems = this._storageItems!.filter((ent) => ent !== entry);
      return true;
    } catch (err) {
      return false;
    }
  }

  private async _openDialog(entry?: Zone) {
    showZoneDetailDialog(this, {
      entry,
      createEntry: (values) => this._createEntry(values),
      updateEntry: entry
        ? (values) => this._updateEntry(entry, values)
        : undefined,
      removeEntry: entry ? () => this._removeEntry(entry) : undefined,
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
      .flex {
        display: flex;
        height: 100%;
      }
      ha-locations-editor {
        flex-grow: 1;
        height: 100%;
      }
      .flex paper-listbox {
        border-left: 1px solid var(--divider-color);
        width: 250px;
      }
      paper-icon-item {
        padding-top: 4px;
        padding-bottom: 4px;
      }
      paper-icon-item.iron-selected:before {
        border-radius: 4px;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        pointer-events: none;
        content: "";
        background-color: var(--sidebar-selected-icon-color);
        opacity: 0.12;
        transition: opacity 15ms linear;
        will-change: opacity;
      }
      ha-card paper-item {
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
