import "@material/mwc-button/mwc-button";
import "@material/mwc-formfield/mwc-formfield";
import "@material/mwc-list/mwc-list-item";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import {
  ConfigEntry,
  deleteConfigEntry,
  getConfigEntry,
} from "../../../data/config_entries";
import { updateDeviceRegistryEntry } from "../../../data/device_registry";
import {
  ExtEntityRegistryEntry,
  removeEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { fetchIntegrationManifest } from "../../../data/integration";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showDeviceRegistryDetailDialog } from "../devices/device-registry-detail/show-dialog-device-registry-detail";
import "./entity-registry-settings-editor";
import type { EntityRegistrySettingsEditor } from "./entity-registry-settings-editor";

const invalidDomainUpdate = false;

@customElement("entity-registry-settings")
export class EntityRegistrySettings extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public entry!: ExtEntityRegistryEntry;

  @state() private _helperConfigEntry?: ConfigEntry;

  @state() private _error?: string;

  @state() private _submitting?: boolean;

  @query("entity-registry-settings-editor")
  private _registryEditor?: EntityRegistrySettingsEditor;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("entry")) {
      this._fetchHelperConfigEntry();
    }
  }

  private async _fetchHelperConfigEntry() {
    this._helperConfigEntry = undefined;
    if (!this.entry?.config_entry_id) {
      return;
    }
    try {
      const configEntry = (
        await getConfigEntry(this.hass, this.entry.config_entry_id)
      ).config_entry;
      const manifest = await fetchIntegrationManifest(
        this.hass,
        configEntry.domain
      );
      if (manifest.integration_type === "helper") {
        this._helperConfigEntry = configEntry;
      }
      // eslint-disable-next-line no-empty
    } catch (err) {}
  }

  protected render() {
    const stateObj: HassEntity | undefined =
      this.hass.states[this.entry.entity_id];

    const device = this.entry.device_id
      ? this.hass.devices[this.entry.device_id]
      : undefined;

    return html`
      ${!stateObj
        ? html`
            <ha-alert alert-type="warning">
              ${device?.disabled_by
                ? html`${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.device_disabled"
                    )}<mwc-button
                      @click=${this._openDeviceSettings}
                      slot="action"
                    >
                      ${this.hass!.localize(
                        "ui.dialogs.entity_registry.editor.open_device_settings"
                      )}
                    </mwc-button>`
                : this.entry.disabled_by
                ? html`${this.hass!.localize(
                    "ui.dialogs.entity_registry.editor.entity_disabled"
                  )}${["user", "integration"].includes(this.entry.disabled_by!)
                    ? html`<mwc-button
                        slot="action"
                        @click=${this._enableEntry}
                      >
                        ${this.hass!.localize(
                          "ui.dialogs.entity_registry.editor.enable_entity"
                        )}</mwc-button
                      >`
                    : ""}`
                : this.hass!.localize(
                    "ui.dialogs.entity_registry.editor.unavailable"
                  )}
            </ha-alert>
          `
        : ""}
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : ""}
      <div class="form container">
        <entity-registry-settings-editor
          .hass=${this.hass}
          .entry=${this.entry}
          .helperConfigEntry=${this._helperConfigEntry}
          .disabled=${this._submitting}
          @change=${this._entityRegistryChanged}
        ></entity-registry-settings-editor>
      </div>
      <div class="buttons">
        <mwc-button
          class="warning"
          @click=${this._confirmDeleteEntry}
          .disabled=${this._submitting ||
          (!this._helperConfigEntry && !stateObj?.attributes.restored)}
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

  private _entityRegistryChanged() {
    this._error = undefined;
  }

  private _openDeviceSettings() {
    const device = this.hass.devices[this.entry.device_id!];

    showDeviceRegistryDetailDialog(this, {
      device: device,
      updateEntry: async (updates) => {
        await updateDeviceRegistryEntry(this.hass, device.id, updates);
      },
    });
  }

  private async _enableEntry() {
    this._error = undefined;
    this._submitting = true;
    try {
      const result = await updateEntityRegistryEntry(
        this.hass!,
        this.entry.entity_id,
        { disabled_by: null }
      );
      fireEvent(this, "entity-entry-updated", result.entity_entry);
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
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._submitting = false;
    }
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    try {
      const result = await this._registryEditor!.updateEntry();
      if (result.close) {
        fireEvent(this, "close-dialog");
      }
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
      if (this._helperConfigEntry) {
        await deleteConfigEntry(this.hass, this._helperConfigEntry.entry_id);
      } else {
        await removeEntityRegistryEntry(this.hass!, this.entry.entity_id);
      }
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
          padding: 8px 24px 20px 24px;
        }
        .buttons {
          box-sizing: border-box;
          display: flex;
          padding: 8px 16px 8px 24px;
          justify-content: space-between;
          padding-bottom: max(env(safe-area-inset-bottom), 8px);
          background-color: var(--mdc-theme-surface, #fff);
          border-top: 1px solid var(--divider-color);
          position: sticky;
          bottom: 0px;
        }
        ha-alert mwc-button {
          width: max-content;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-registry-settings": EntityRegistrySettings;
  }
  interface HASSDomEvents {
    "entity-entry-updated": ExtEntityRegistryEntry;
  }
}
