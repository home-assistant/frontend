import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import { mdiTextureBox } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
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
import {
  FloorRegistryEntry,
  FloorRegistryEntryMutableParams,
} from "../../../data/floor_registry";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { FloorRegistryDetailDialogParams } from "./show-dialog-floor-registry-detail";
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

  public async showDialog(
    params: FloorRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry
      ? this._params.entry.name
      : this._params.suggestedName || "";
    this._aliases = this._params.entry?.aliases || [];
    this._icon = this._params.entry?.icon || null;
    this._level = this._params.entry?.level ?? null;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _floorAreas = memoizeOne(
    (areas: HomeAssistant["areas"], entry?: FloorRegistryEntry) => {
      if (!entry) {
        return [];
      }
      return Object.values(areas).filter(
        (area) => area.floor_id === entry.floor_id
      );
    }
  );

  protected render() {
    const areas = this._floorAreas(this.hass.areas, this._params?.entry);

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

            ${areas.length
              ? html`<ha-chip-set>
                  ${repeat(
                    areas,
                    (area) => area.area_id,
                    (area) =>
                      html`<ha-input-chip
                        .area=${area}
                        @remove=${this._removeArea}
                        @click=${this._openAreaDetail}
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
              .excludeAreas=${areas}
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
            : this.hass.localize("ui.common.add")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _removeArea(ev) {
    const area = ev.target.area;
    updateAreaRegistryEntry(this.hass, area.area_id, { floor_id: null });
  }

  private _addArea(ev) {
    const areaId = ev.detail.value;
    if (!areaId) {
      return;
    }
    updateAreaRegistryEntry(this.hass, areaId, {
      floor_id: this._params!.entry!.floor_id,
    });
    ev.target.value = "";
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
        await this._params!.createEntry!(values);
      } else {
        await this._params!.updateEntry!(values);
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
          margin: 16px 0 8px;
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
