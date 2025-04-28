import "@material/mwc-button";

import { mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/chips/ha-chip-set";
import "../../../components/chips/ha-input-chip";
import "../../../components/ha-alert";
import "../../../components/ha-aliases-editor";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-picker";
import "../../../components/ha-picture-upload";
import "../../../components/ha-settings-row";
import "../../../components/ha-svg-icon";
import "../../../components/ha-textfield";
import "../../../components/ha-area-picker";
import type {
  FloorRegistryEntry,
  FloorRegistryEntryMutableParams,
} from "../../../data/floor_registry";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { FloorRegistryDetailDialogParams } from "./show-dialog-floor-registry-detail";
import { showAreaRegistryDetailDialog } from "./show-dialog-area-registry-detail";
import { updateAreaRegistryEntry } from "../../../data/area_registry";

class DialogFloorDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _aliases!: string[];

  @state() private _icon!: string | null;

  @state() private _level!: number | null;

  @state() private _error?: string;

  @state() private _params?: FloorRegistryDetailDialogParams;

  @state() private _submitting?: boolean;

  @state() private _addedAreas = new Set<string>();

  @state() private _removedAreas = new Set<string>();

  public showDialog(params: FloorRegistryDetailDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry
      ? this._params.entry.name
      : this._params.suggestedName || "";
    this._aliases = this._params.entry?.aliases || [];
    this._icon = this._params.entry?.icon || null;
    this._level = this._params.entry?.level ?? null;
    this._addedAreas.clear();
    this._removedAreas.clear();
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    this._addedAreas.clear();
    this._removedAreas.clear();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _floorAreas = memoizeOne(
    (
      entry: FloorRegistryEntry | undefined,
      areas: HomeAssistant["areas"],
      added: Set<string>,
      removed: Set<string>
    ) =>
      Object.values(areas).filter(
        (area) =>
          (area.floor_id === entry?.floor_id || added.has(area.area_id)) &&
          !removed.has(area.area_id)
      )
  );

  protected render() {
    const areas = this._floorAreas(
      this._params?.entry,
      this.hass.areas,
      this._addedAreas,
      this._removedAreas
    );

    if (!this._params) {
      return nothing;
    }
    const entry = this._params.entry;
    const nameInvalid = !this._isNameValid();

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          entry
            ? this.hass.localize("ui.panel.config.floors.editor.update_floor")
            : this.hass.localize("ui.panel.config.floors.editor.create_floor")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="form">
            ${entry
              ? html`
                  <ha-settings-row>
                    <span slot="heading">
                      ${this.hass.localize(
                        "ui.panel.config.floors.editor.floor_id"
                      )}
                    </span>
                    <span slot="description">${entry.floor_id}</span>
                  </ha-settings-row>
                `
              : nothing}

            <ha-textfield
              .value=${this._name}
              @input=${this._nameChanged}
              .label=${this.hass.localize("ui.panel.config.floors.editor.name")}
              .validationMessage=${this.hass.localize(
                "ui.panel.config.floors.editor.name_required"
              )}
              required
              dialogInitialFocus
            ></ha-textfield>

            <ha-textfield
              .value=${this._level}
              @input=${this._levelChanged}
              .label=${this.hass.localize(
                "ui.panel.config.floors.editor.level"
              )}
              type="number"
            ></ha-textfield>

            <ha-icon-picker
              .hass=${this.hass}
              .value=${this._icon}
              @value-changed=${this._iconChanged}
              .label=${this.hass.localize("ui.panel.config.areas.editor.icon")}
            >
              ${!this._icon
                ? html`
                    <ha-floor-icon
                      slot="fallback"
                      .floor=${{ level: this._level }}
                    ></ha-floor-icon>
                  `
                : nothing}
            </ha-icon-picker>

            <h3 class="header">
              ${this.hass.localize(
                "ui.panel.config.floors.editor.areas_section"
              )}
            </h3>

            <p class="description">
              ${this.hass.localize(
                "ui.panel.config.floors.editor.areas_description"
              )}
            </p>
            ${areas.length
              ? html`<ha-chip-set>
                  ${repeat(
                    areas,
                    (area) => area.area_id,
                    (area) =>
                      html`<ha-input-chip
                        .area=${area}
                        @click=${this._openArea}
                        @remove=${this._removeArea}
                        .label=${area?.name}
                      >
                        ${area.icon
                          ? html`<ha-icon
                              slot="icon"
                              .icon=${area.icon}
                            ></ha-icon>`
                          : html`<ha-svg-icon
                              slot="icon"
                              .path=${mdiTextureBox}
                            ></ha-svg-icon>`}
                      </ha-input-chip>`
                  )}
                </ha-chip-set>`
              : nothing}
            <ha-area-picker
              no-add
              .hass=${this.hass}
              @value-changed=${this._addArea}
              .excludeAreas=${areas.map((a) => a.area_id)}
              .label=${this.hass.localize(
                "ui.panel.config.floors.editor.add_area"
              )}
            ></ha-area-picker>

            <h3 class="header">
              ${this.hass.localize(
                "ui.panel.config.floors.editor.aliases_section"
              )}
            </h3>

            <p class="description">
              ${this.hass.localize(
                "ui.panel.config.floors.editor.aliases_description"
              )}
            </p>
            <ha-aliases-editor
              .hass=${this.hass}
              .aliases=${this._aliases}
              @value-changed=${this._aliasesChanged}
            ></ha-aliases-editor>
          </div>
        </div>
        <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${nameInvalid || this._submitting}
        >
          ${entry
            ? this.hass.localize("ui.common.save")
            : this.hass.localize("ui.common.create")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _openArea(ev) {
    const area = ev.target.area;
    showAreaRegistryDetailDialog(this, {
      entry: area,
      updateEntry: (values) =>
        updateAreaRegistryEntry(this.hass!, area.area_id, values),
    });
  }

  private _removeArea(ev) {
    const areaId = ev.target.area.area_id;
    if (this._addedAreas.has(areaId)) {
      this._addedAreas.delete(areaId);
      this._addedAreas = new Set(this._addedAreas);
      return;
    }
    this._removedAreas.add(areaId);
    this._removedAreas = new Set(this._removedAreas);
  }

  private _addArea(ev) {
    const areaId = ev.detail.value;
    if (!areaId) {
      return;
    }
    ev.target.value = "";
    if (this._removedAreas.has(areaId)) {
      this._removedAreas.delete(areaId);
      this._removedAreas = new Set(this._removedAreas);
      return;
    }
    this._addedAreas.add(areaId);
    this._addedAreas = new Set(this._addedAreas);
  }

  private _isNameValid() {
    return this._name.trim() !== "";
  }

  private _nameChanged(ev) {
    this._error = undefined;
    this._name = ev.target.value;
  }

  private _levelChanged(ev) {
    this._error = undefined;
    this._level = ev.target.value === "" ? null : Number(ev.target.value);
  }

  private _iconChanged(ev) {
    this._error = undefined;
    this._icon = ev.detail.value;
  }

  private async _updateEntry() {
    this._submitting = true;
    const create = !this._params!.entry;
    try {
      const values: FloorRegistryEntryMutableParams = {
        name: this._name.trim(),
        icon: this._icon || (create ? undefined : null),
        level: this._level,
        aliases: this._aliases,
      };
      if (create) {
        await this._params!.createEntry!(values, this._addedAreas);
      } else {
        await this._params!.updateEntry!(
          values,
          this._addedAreas,
          this._removedAreas
        );
      }
      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize("ui.panel.config.floors.editor.unknown_error");
    } finally {
      this._submitting = false;
    }
  }

  private _aliasesChanged(ev: CustomEvent): void {
    this._aliases = ev.detail.value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-textfield {
          display: block;
          margin-bottom: 16px;
        }
        ha-floor-icon {
          color: var(--secondary-text-color);
        }
        ha-chip-set {
          margin-bottom: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-floor-registry-detail": DialogFloorDetail;
  }
}

customElements.define("dialog-floor-registry-detail", DialogFloorDetail);
