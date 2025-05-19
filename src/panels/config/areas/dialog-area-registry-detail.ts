import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import type { HassEntity } from "home-assistant-js-websocket";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-aliases-editor";
import "../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../components/ha-picture-upload";
import "../../../components/ha-settings-row";
import "../../../components/ha-icon-picker";
import "../../../components/ha-floor-picker";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-textfield";
import "../../../components/ha-labels-picker";
import type {
  AreaRegistryEntry,
  AreaRegistryEntryMutableParams,
} from "../../../data/area_registry";
import { deleteAreaRegistryEntry } from "../../../data/area_registry";
import type { CropOptions } from "../../../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import type { AreaRegistryDetailDialogParams } from "./show-dialog-area-registry-detail";
import {
  SENSOR_DEVICE_CLASS_HUMIDITY,
  SENSOR_DEVICE_CLASS_TEMPERATURE,
} from "../../../data/sensor";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { createCloseHeading } from "../../../components/ha-dialog";

const cropOptions: CropOptions = {
  round: false,
  type: "image/jpeg",
  quality: 0.75,
  aspectRatio: 1.78,
};

const SENSOR_DOMAINS = ["sensor"];
const TEMPERATURE_DEVICE_CLASSES = [SENSOR_DEVICE_CLASS_TEMPERATURE];
const HUMIDITY_DEVICE_CLASSES = [SENSOR_DEVICE_CLASS_HUMIDITY];

class DialogAreaDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _aliases!: string[];

  @state() private _labels!: string[];

  @state() private _picture!: string | null;

  @state() private _icon!: string | null;

  @state() private _floor!: string | null;

  @state() private _temperatureEntity!: string | null;

  @state() private _humidityEntity!: string | null;

  @state() private _error?: string;

  @state() private _params?: AreaRegistryDetailDialogParams;

  @state() private _submitting?: boolean;

  public async showDialog(
    params: AreaRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    if (this._params.entry) {
      this._name = this._params.entry.name;
      this._aliases = this._params.entry.aliases;
      this._labels = this._params.entry.labels;
      this._picture = this._params.entry.picture;
      this._icon = this._params.entry.icon;
      this._floor = this._params.entry.floor_id;
      this._temperatureEntity = this._params.entry.temperature_entity_id;
      this._humidityEntity = this._params.entry.humidity_entity_id;
    } else {
      this._name = this._params.suggestedName || "";
      this._aliases = [];
      this._labels = [];
      this._picture = null;
      this._icon = null;
      this._floor = null;
      this._temperatureEntity = null;
      this._humidityEntity = null;
    }

    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _renderSettings(entry: AreaRegistryEntry | undefined) {
    return html`
      ${entry
        ? html`
            <ha-settings-row>
              <span slot="heading">
                ${this.hass.localize("ui.panel.config.areas.editor.area_id")}
              </span>
              <span slot="description"> ${entry.area_id} </span>
            </ha-settings-row>
          `
        : nothing}

      <ha-textfield
        .value=${this._name}
        @input=${this._nameChanged}
        .label=${this.hass.localize("ui.panel.config.areas.editor.name")}
        .validationMessage=${this.hass.localize(
          "ui.panel.config.areas.editor.name_required"
        )}
        required
        dialogInitialFocus
      ></ha-textfield>

      <ha-icon-picker
        .hass=${this.hass}
        .value=${this._icon}
        @value-changed=${this._iconChanged}
        .label=${this.hass.localize("ui.panel.config.areas.editor.icon")}
      ></ha-icon-picker>

      <ha-floor-picker
        .hass=${this.hass}
        .value=${this._floor}
        @value-changed=${this._floorChanged}
        .label=${this.hass.localize("ui.panel.config.areas.editor.floor")}
      ></ha-floor-picker>

      <ha-labels-picker
        .hass=${this.hass}
        .value=${this._labels}
        @value-changed=${this._labelsChanged}
        .placeholder=${this.hass.localize(
          "ui.panel.config.areas.editor.add_labels"
        )}
      ></ha-labels-picker>

      <ha-picture-upload
        .hass=${this.hass}
        .value=${this._picture}
        crop
        select-media
        .cropOptions=${cropOptions}
        @change=${this._pictureChanged}
      ></ha-picture-upload>
    `;
  }

  private _renderAliasExpansion() {
    return html`
      <ha-expansion-panel
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.areas.editor.aliases_section"
        )}
        expanded
      >
        <div class="content">
          <p class="description">
            ${this.hass.localize(
              "ui.panel.config.areas.editor.aliases_description"
            )}
          </p>
          <ha-aliases-editor
            .hass=${this.hass}
            .aliases=${this._aliases}
            @value-changed=${this._aliasesChanged}
          ></ha-aliases-editor>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderRelatedEntitiesExpansion() {
    return html`
      <ha-expansion-panel
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.areas.editor.related_entities_section"
        )}
        expanded
      >
        <div class="content">
          <ha-entity-picker
            .hass=${this.hass}
            .label=${this.hass.localize(
              "ui.panel.config.areas.editor.temperature_entity"
            )}
            .helper=${this.hass.localize(
              "ui.panel.config.areas.editor.temperature_entity_description"
            )}
            .value=${this._temperatureEntity}
            .includeDomains=${SENSOR_DOMAINS}
            .includeDeviceClasses=${TEMPERATURE_DEVICE_CLASSES}
            .entityFilter=${this._areaEntityFilter}
            @value-changed=${this._sensorChanged}
          ></ha-entity-picker>

          <ha-entity-picker
            .hass=${this.hass}
            .label=${this.hass.localize(
              "ui.panel.config.areas.editor.humidity_entity"
            )}
            .helper=${this.hass.localize(
              "ui.panel.config.areas.editor.humidity_entity_description"
            )}
            .value=${this._humidityEntity}
            .includeDomains=${SENSOR_DOMAINS}
            .includeDeviceClasses=${HUMIDITY_DEVICE_CLASSES}
            .entityFilter=${this._areaEntityFilter}
            @value-changed=${this._sensorChanged}
          ></ha-entity-picker>
        </div>
      </ha-expansion-panel>
    `;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const entry = this._params.entry;
    const nameInvalid = !this._isNameValid();
    const isNew = !entry;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          entry
            ? this.hass.localize("ui.panel.config.areas.editor.update_area")
            : this.hass.localize("ui.panel.config.areas.editor.create_area")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="form">
            ${this._renderSettings(entry)} ${this._renderAliasExpansion()}
            ${!isNew ? this._renderRelatedEntitiesExpansion() : nothing}
          </div>
        </div>
        ${!isNew
          ? html`<ha-button
              slot="secondaryAction"
              destructive
              @click=${this._deleteArea}
            >
              ${this.hass.localize("ui.common.delete")}
            </ha-button>`
          : nothing}
        <div slot="primaryAction">
          <ha-button @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            @click=${this._updateEntry}
            .disabled=${nameInvalid || this._submitting}
          >
            ${entry
              ? this.hass.localize("ui.common.save")
              : this.hass.localize("ui.common.create")}
          </ha-button>
        </div>
      </ha-dialog>
    `;
  }

  private _isNameValid() {
    return this._name.trim() !== "";
  }

  private _areaEntityFilter = (stateObj: HassEntity): boolean => {
    const entityReg = this.hass.entities[stateObj.entity_id];
    if (!entityReg) {
      return false;
    }
    const areaId = this._params!.entry!.area_id;
    if (entityReg.area_id === areaId) {
      return true;
    }
    if (!entityReg.device_id) {
      return false;
    }
    const deviceReg = this.hass.devices[entityReg.device_id];
    return deviceReg && deviceReg.area_id === areaId;
  };

  private _nameChanged(ev) {
    this._error = undefined;
    this._name = ev.target.value;
  }

  private _floorChanged(ev) {
    this._error = undefined;
    this._floor = ev.detail.value;
  }

  private _iconChanged(ev) {
    this._error = undefined;
    this._icon = ev.detail.value;
  }

  private _labelsChanged(ev) {
    this._error = undefined;
    this._labels = ev.detail.value;
  }

  private _pictureChanged(ev: ValueChangedEvent<string | null>) {
    this._error = undefined;
    this._picture = (ev.target as HaPictureUpload).value;
  }

  private _aliasesChanged(ev: CustomEvent): void {
    this._aliases = ev.detail.value;
  }

  private _sensorChanged(ev: CustomEvent): void {
    const deviceClass = (ev.target as HaEntityPicker).includeDeviceClasses![0];
    const key = `_${deviceClass}Entity`;
    this[key] = ev.detail.value || null;
  }

  private async _updateEntry() {
    const create = !this._params!.entry;
    this._submitting = true;
    try {
      const values: AreaRegistryEntryMutableParams = {
        name: this._name.trim(),
        picture: this._picture || (create ? undefined : null),
        icon: this._icon || (create ? undefined : null),
        floor_id: this._floor || (create ? undefined : null),
        labels: this._labels || null,
        aliases: this._aliases,
        temperature_entity_id: this._temperatureEntity,
        humidity_entity_id: this._humidityEntity,
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
        this.hass.localize("ui.panel.config.areas.editor.unknown_error");
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteArea() {
    if (!this._params?.entry) {
      return;
    }

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.areas.delete.confirmation_title",
        { name: this._params.entry.name }
      ),
      text: this.hass.localize(
        "ui.panel.config.areas.delete.confirmation_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    await deleteAreaRegistryEntry(this.hass!, this._params!.entry!.area_id);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-textfield {
          display: block;
        }
        ha-expansion-panel {
          --expansion-panel-content-padding: 0;
        }
        ha-aliases-editor,
        ha-entity-picker,
        ha-floor-picker,
        ha-icon-picker,
        ha-labels-picker,
        ha-picture-upload,
        ha-expansion-panel {
          display: block;
          margin-bottom: 16px;
        }
        ha-dialog {
          --mdc-dialog-min-width: min(600px, 100vw);
        }
        .content {
          padding: 12px;
        }
        .description {
          margin: 0 0 16px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-area-registry-detail": DialogAreaDetail;
  }
}

customElements.define("dialog-area-registry-detail", DialogAreaDetail);
