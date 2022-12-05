import "@material/mwc-formfield/mwc-formfield";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-area-picker";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-radio";
import "../../../components/ha-switch";
import "../../../components/ha-textfield";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  EntityRegistryEntryUpdateParams,
  ExtEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";

@customElement("ha-registry-basic-editor")
export class HaEntityRegistryBasicEditor extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry!: ExtEntityRegistryEntry;

  @state() private _origEntityId!: string;

  @state() private _entityId!: string;

  @state() private _areaId?: string | null;

  @state() private _disabledBy!: EntityRegistryEntry["disabled_by"];

  @state() private _hiddenBy!: string | null;

  private _deviceLookup?: Record<string, DeviceRegistryEntry>;

  @state() private _device?: DeviceRegistryEntry;

  @state() private _submitting = false;

  public async updateEntry(): Promise<void> {
    this._submitting = true;
    const params: Partial<EntityRegistryEntryUpdateParams> = {
      new_entity_id: this._entityId.trim(),
      area_id: this._areaId || null,
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
    } finally {
      this._submitting = false;
    }
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._deviceLookup = {};
        for (const device of devices) {
          this._deviceLookup[device.id] = device;
        }
        if (!this._device && this.entry.device_id) {
          this._device = this._deviceLookup[this.entry.device_id];
        }
      }),
    ];
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (!changedProperties.has("entry")) {
      return;
    }
    if (this.entry) {
      this._origEntityId = this.entry.entity_id;
      this._entityId = this.entry.entity_id;
      this._disabledBy = this.entry.disabled_by;
      this._hiddenBy = this.entry.hidden_by;
      this._areaId = this.entry.area_id;
      this._device =
        this.entry.device_id && this._deviceLookup
          ? this._deviceLookup[this.entry.device_id]
          : undefined;
    }
  }

  protected render(): TemplateResult {
    if (
      !this.hass ||
      !this.entry ||
      this.entry.entity_id !== this._origEntityId
    ) {
      return html``;
    }
    const invalidDomainUpdate =
      computeDomain(this._entityId.trim()) !==
      computeDomain(this.entry.entity_id);

    return html`
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
      <ha-area-picker
        .hass=${this.hass}
        .value=${this._areaId || undefined}
        .placeholder=${this._device?.area_id || undefined}
        @value-changed=${this._areaPicked}
      ></ha-area-picker>

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
              .disabled=${!!this._device?.disabled_by ||
              (this._disabledBy !== null &&
                !(
                  this._disabledBy === "user" ||
                  this._disabledBy === "integration"
                ))}
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
              .disabled=${!!this._device?.disabled_by ||
              (this._disabledBy !== null &&
                !(
                  this._disabledBy === "user" ||
                  this._disabledBy === "integration"
                ))}
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
              .disabled=${!!this._device?.disabled_by ||
              (this._disabledBy !== null &&
                !(
                  this._disabledBy === "user" ||
                  this._disabledBy === "integration"
                ))}
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
      </ha-expansion-panel>
    `;
  }

  private _areaPicked(ev: CustomEvent) {
    this._areaId = ev.detail.value;
  }

  private _entityIdChanged(ev): void {
    this._entityId = ev.target.value;
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

  static get styles() {
    return css`
      ha-switch {
        margin-right: 16px;
      }
      .row {
        margin-top: 8px;
        color: var(--primary-text-color);
        display: flex;
        align-items: center;
      }
      .secondary {
        color: var(--secondary-text-color);
      }
      ha-textfield {
        display: block;
        margin-bottom: 8px;
      }
      ha-expansion-panel {
        margin-top: 8px;
      }
      .label {
        margin-top: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-registry-basic-editor": HaEntityRegistryBasicEditor;
  }
}
