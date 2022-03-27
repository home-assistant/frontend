import "@material/mwc-formfield/mwc-formfield";
import "../../../components/ha-radio";
import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { domainIcon } from "../../../common/entity/domain_icon";
import "../../../components/ha-alert";
import "../../../components/ha-area-picker";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-picker";
import "../../../components/ha-select";
import "../../../components/ha-switch";
import "../../../components/ha-textfield";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
  updateDeviceRegistryEntry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntryUpdateParams,
  ExtEntityRegistryEntry,
  removeEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showDeviceRegistryDetailDialog } from "../devices/device-registry-detail/show-dialog-device-registry-detail";

const OVERRIDE_DEVICE_CLASSES = {
  cover: [
    "awning",
    "blind",
    "curtain",
    "damper",
    "door",
    "garage",
    "gate",
    "shade",
    "shutter",
    "window",
  ],
  binary_sensor: ["window", "door", "garage_door", "opening"],
};

@customElement("entity-registry-settings")
export class EntityRegistrySettings extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entry!: ExtEntityRegistryEntry;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _entityId!: string;

  @state() private _deviceClass?: string;

  @state() private _areaId?: string | null;

  @state() private _disabledBy!: string | null;

  @state() private _hiddenBy!: string | null;

  private _deviceLookup?: Record<string, DeviceRegistryEntry>;

  @state() private _device?: DeviceRegistryEntry;

  @state() private _error?: string;

  @state() private _submitting?: boolean;

  private _origEntityId!: string;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._deviceLookup = {};
        for (const device of devices) {
          this._deviceLookup[device.id] = device;
        }
        if (this.entry.device_id) {
          this._device = this._deviceLookup[this.entry.device_id];
        }
      }),
    ];
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("entry")) {
      this._error = undefined;
      this._name = this.entry.name || "";
      this._icon = this.entry.icon || "";
      this._deviceClass =
        this.entry.device_class || this.entry.original_device_class;
      this._origEntityId = this.entry.entity_id;
      this._areaId = this.entry.area_id;
      this._entityId = this.entry.entity_id;
      this._disabledBy = this.entry.disabled_by;
      this._hiddenBy = this.entry.hidden_by;
      this._device =
        this.entry.device_id && this._deviceLookup
          ? this._deviceLookup[this.entry.device_id]
          : undefined;
    }
  }

  protected render(): TemplateResult {
    if (this.entry.entity_id !== this._origEntityId) {
      return html``;
    }
    const stateObj: HassEntity | undefined =
      this.hass.states[this.entry.entity_id];

    const domain = computeDomain(this.entry.entity_id);

    const invalidDomainUpdate = computeDomain(this._entityId.trim()) !== domain;

    return html`
      ${!stateObj
        ? html`
            <div class="container warning">
              ${this.hass!.localize(
                "ui.dialogs.entity_registry.editor.unavailable"
              )}
              ${this._device?.disabled_by
                ? html`<br />${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.device_disabled"
                    )}<br /><mwc-button @click=${this._openDeviceSettings}>
                      ${this.hass!.localize(
                        "ui.dialogs.entity_registry.editor.open_device_settings"
                      )}
                    </mwc-button>`
                : ""}
            </div>
          `
        : ""}
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : ""}
      <div class="form container">
        <ha-textfield
          .value=${this._name}
          .label=${this.hass.localize("ui.dialogs.entity_registry.editor.name")}
          .invalid=${invalidDomainUpdate}
          .disabled=${this._submitting}
          .placeholder=${this.entry.original_name}
          @input=${this._nameChanged}
        ></ha-textfield>
        <ha-icon-picker
          .value=${this._icon}
          @value-changed=${this._iconChanged}
          .label=${this.hass.localize("ui.dialogs.entity_registry.editor.icon")}
          .placeholder=${this.entry.original_icon || stateObj?.attributes.icon}
          .fallbackPath=${!this._icon && !stateObj?.attributes.icon && stateObj
            ? domainIcon(computeDomain(stateObj.entity_id), stateObj)
            : undefined}
          .disabled=${this._submitting}
        ></ha-icon-picker>
        ${OVERRIDE_DEVICE_CLASSES[domain]?.includes(this._deviceClass) ||
        (domain === "cover" && this.entry.original_device_class === null)
          ? html`<ha-select
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.device_class"
              )}
              .value=${this._deviceClass}
              naturalMenuWidth
              fixedMenuPosition
              @selected=${this._deviceClassChanged}
              @closed=${stopPropagation}
            >
              ${OVERRIDE_DEVICE_CLASSES[domain].map(
                (deviceClass: string) => html`
                  <mwc-list-item .value=${deviceClass}>
                    ${this.hass.localize(
                      `ui.dialogs.entity_registry.editor.device_classes.${domain}.${deviceClass}`
                    )}
                  </mwc-list-item>
                `
              )}
            </ha-select>`
          : ""}
        <ha-textfield
          error-message="Domain needs to stay the same"
          .value=${this._entityId}
          .label=${this.hass.localize(
            "ui.dialogs.entity_registry.editor.entity_id"
          )}
          .invalid=${invalidDomainUpdate}
          .disabled=${this._submitting}
          @input=${this._entityIdChanged}
        ></ha-textfield>
        ${!this.entry.device_id
          ? html`<ha-area-picker
              .hass=${this.hass}
              .value=${this._areaId}
              @value-changed=${this._areaPicked}
            ></ha-area-picker>`
          : ""}
        <ha-expansion-panel
          .header=${this.hass.localize(
            "ui.dialogs.entity_registry.editor.advanced"
          )}
          outlined
        >
          <div class="label">
            ${this.hass.localize(
              "ui.dialogs.entity_registry.editor.entity_status"
            )}:
          </div>
          <div class="secondary">
            ${this._disabledBy && this._disabledBy !== "user"
              ? this.hass.localize(
                  "ui.dialogs.entity_registry.editor.enabled_cause",
                  "cause",
                  this.hass.localize(
                    `config_entry.disabled_by.${this._disabledBy}`
                  )
                )
              : ""}
          </div>
          <div class="row">
            <mwc-formfield
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.enabled_label"
              )}
            >
              <ha-radio
                name="hiddendisabled"
                value="enabled"
                .checked=${!this._hiddenBy && !this._disabledBy}
                .disabled=${(this._hiddenBy && this._hiddenBy !== "user") ||
                this._device?.disabled_by ||
                (this._disabledBy && this._disabledBy !== "user")}
                @change=${this._viewStatusChanged}
              ></ha-radio>
            </mwc-formfield>
            <mwc-formfield
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.hidden_label"
              )}
            >
              <ha-radio
                name="hiddendisabled"
                value="hidden"
                .checked=${this._hiddenBy !== null}
                .disabled=${(this._hiddenBy && this._hiddenBy !== "user") ||
                Boolean(this._device?.disabled_by) ||
                (this._disabledBy && this._disabledBy !== "user")}
                @change=${this._viewStatusChanged}
              ></ha-radio>
            </mwc-formfield>
            <mwc-formfield
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.disabled_label"
              )}
            >
              <ha-radio
                name="hiddendisabled"
                value="disabled"
                .checked=${this._disabledBy !== null}
                .disabled=${(this._hiddenBy && this._hiddenBy !== "user") ||
                Boolean(this._device?.disabled_by) ||
                (this._disabledBy && this._disabledBy !== "user")}
                @change=${this._viewStatusChanged}
              ></ha-radio>
            </mwc-formfield>
          </div>

          ${this._disabledBy !== null
            ? html`
                <div class="secondary">
                  ${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.enabled_description"
                  )}
                </div>
              `
            : this._hiddenBy !== null
            ? html`
                <div class="secondary">
                  ${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.hidden_description"
                  )}
                </div>
              `
            : ""}
          ${this.entry.device_id
            ? html`
                <div class="label">
                  ${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.change_area"
                  )}:
                </div>
                <ha-area-picker
                  .hass=${this.hass}
                  .value=${this._areaId}
                  .placeholder=${this._device?.area_id}
                  .label=${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.area"
                  )}
                  @value-changed=${this._areaPicked}
                ></ha-area-picker>
                <div class="secondary">
                  ${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.area_note"
                  )}
                  ${this._device
                    ? html`
                        <button class="link" @click=${this._openDeviceSettings}>
                          ${this.hass.localize(
                            "ui.dialogs.entity_registry.editor.change_device_area"
                          )}
                        </button>
                      `
                    : ""}
                </div>
              `
            : ""}
        </ha-expansion-panel>
      </div>
      <div class="buttons">
        <mwc-button
          class="warning"
          @click=${this._confirmDeleteEntry}
          .disabled=${this._submitting ||
          !(stateObj && stateObj.attributes.restored)}
        >
          ${this.hass.localize("ui.dialogs.entity_registry.editor.delete")}
        </mwc-button>
        <mwc-button
          @click=${this._updateEntry}
          .disabled=${invalidDomainUpdate || this._submitting}
        >
          ${this.hass.localize("ui.dialogs.entity_registry.editor.update")}
        </mwc-button>
      </div>
    `;
  }

  private _nameChanged(ev): void {
    this._error = undefined;
    this._name = ev.target.value;
  }

  private _iconChanged(ev: CustomEvent): void {
    this._error = undefined;
    this._icon = ev.detail.value;
  }

  private _entityIdChanged(ev): void {
    this._error = undefined;
    this._entityId = ev.target.value;
  }

  private _deviceClassChanged(ev): void {
    this._error = undefined;
    this._deviceClass = ev.target.value;
  }

  private _areaPicked(ev: CustomEvent) {
    this._error = undefined;
    this._areaId = ev.detail.value;
  }

  private _viewStatusChanged(ev: CustomEvent): void {
    switch ((ev.target as any).value) {
      case "enabled":
        this._disabledBy = null;
        this._hiddenBy = null;
        break;
      case "disabled":
        this._disabledBy = "user";
        this._hiddenBy = null;
        break;
      case "hidden":
        this._hiddenBy = "user";
        this._disabledBy = null;
        break;
    }
  }

  private _openDeviceSettings() {
    showDeviceRegistryDetailDialog(this, {
      device: this._device!,
      updateEntry: async (updates) => {
        await updateDeviceRegistryEntry(this.hass, this._device!.id, updates);
      },
    });
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    const params: Partial<EntityRegistryEntryUpdateParams> = {
      name: this._name.trim() || null,
      icon: this._icon.trim() || null,
      area_id: this._areaId || null,
      device_class: this._deviceClass || null,
      new_entity_id: this._entityId.trim(),
    };
    if (
      this.entry.disabled_by !== this._disabledBy &&
      (this._disabledBy === null || this._disabledBy === "user")
    ) {
      params.disabled_by = this._disabledBy;
    }
    if (
      this.entry.hidden_by !== this._hiddenBy &&
      (this._hiddenBy === null || this._hiddenBy === "user")
    ) {
      params.hidden_by = this._hiddenBy;
    }
    try {
      const result = await updateEntityRegistryEntry(
        this.hass!,
        this._origEntityId,
        params
      );
      if (result.require_restart) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.dialogs.entity_registry.editor.enabled_restart_confirm"
          ),
        });
      }
      if (result.reload_delay) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.dialogs.entity_registry.editor.enabled_delay_confirm",
            "delay",
            result.reload_delay
          ),
        });
      }
      fireEvent(this as HTMLElement, "close-dialog");
    } catch (err: any) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _confirmDeleteEntry(): Promise<void> {
    if (
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.dialogs.entity_registry.editor.confirm_delete"
        ),
      }))
    ) {
      return;
    }

    this._submitting = true;

    try {
      await removeEntityRegistryEntry(this.hass!, this._origEntityId);
      fireEvent(this, "close-dialog");
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        .container {
          padding: 20px 24px;
        }
        .form {
          margin-bottom: 53px;
        }
        .buttons {
          position: absolute;
          bottom: 0;
          width: 100%;
          box-sizing: border-box;
          border-top: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
          display: flex;
          justify-content: space-between;
          padding: 8px;
          padding-bottom: max(env(safe-area-inset-bottom), 8px);
          background-color: var(--mdc-theme-surface, #fff);
        }
        ha-select {
          width: 100%;
          margin: 8px 0;
        }
        ha-switch {
          margin-right: 16px;
        }
        ha-textfield {
          display: block;
          margin: 8px 0;
        }
        ha-area-picker {
          margin: 8px 0;
          display: block;
        }
        .row {
          margin: 8px 0;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
        }
        .label {
          margin-top: 16px;
        }
        .secondary {
          margin: 8px 0;
          width: 340px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-registry-settings": EntityRegistrySettings;
  }
}
