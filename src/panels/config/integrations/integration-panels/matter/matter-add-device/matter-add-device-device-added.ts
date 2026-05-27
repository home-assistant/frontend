import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../../../../common/entity/compute_domain";
import { computeDeviceName } from "../../../../../../common/entity/compute_device_name";
import { caseInsensitiveStringCompare } from "../../../../../../common/string/compare";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-area-picker";
import "../../../../../../components/input/ha-input";
import "../../../../../../components/ha-select";
import "../../../../../../components/ha-dropdown-item";
import type { HaSelectSelectEvent } from "../../../../../../components/ha-select";
import type { ExtEntityRegistryEntry } from "../../../../../../data/entity/entity_registry";
import type { DeviceRegistryEntry } from "../../../../../../data/device/device_registry";
import type { HomeAssistant } from "../../../../../../types";
import { brandsUrl } from "../../../../../../util/brands-url";
import { sharedStyles } from "./matter-add-device-shared-styles";
import { OVERRIDE_DEVICE_CLASSES } from "../../../../entities/entity-registry-settings-editor";

declare global {
  interface HASSDomEvents {
    "device-added-changed": {
      name: string;
      area: string | undefined;
      deviceClass: string | undefined;
      hasPendingUpdates: boolean;
    };
  }
}

@customElement("matter-add-device-device-added")
class MatterAddDeviceDeviceAdded extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ attribute: false }) public mainEntity?: ExtEntityRegistryEntry;

  @state() private _deviceName = "";

  @state() private _area: string | undefined;

  @state() private _deviceClass: string | undefined;

  private _initialized = false;

  private _deviceClassInitialized = false;

  protected willUpdate(changedProps: PropertyValues) {
    if (!this._initialized && this.device) {
      this._initialized = true;
      this._deviceName = computeDeviceName(this.device) ?? "";
      this._area = this.device.area_id ?? undefined;
    }
    if (
      !this._deviceClassInitialized &&
      (changedProps.has("mainEntity") || this._initialized) &&
      this.mainEntity
    ) {
      this._deviceClassInitialized = true;
      this._deviceClass =
        this.mainEntity.device_class ??
        this.mainEntity.original_device_class ??
        undefined;
    }
  }

  private get _deviceClassOptions(): string[][] | undefined {
    if (!this.mainEntity) return undefined;
    const domain = computeDomain(this.mainEntity.entity_id);
    const deviceClasses = OVERRIDE_DEVICE_CLASSES[domain];
    if (!deviceClasses) return undefined;

    const options: string[][] = [[], []];
    for (const deviceClass of deviceClasses) {
      if (
        this.mainEntity.original_device_class &&
        deviceClass.includes(this.mainEntity.original_device_class)
      ) {
        options[0] = deviceClass;
      } else {
        options[1].push(...deviceClass);
      }
    }
    return options;
  }

  private get _hasPendingUpdates(): boolean {
    const origName = computeDeviceName(this.device) ?? "";
    const origArea = this.device.area_id ?? undefined;
    const origDeviceClass =
      this.mainEntity?.device_class ??
      this.mainEntity?.original_device_class ??
      undefined;
    return (
      this._deviceName !== origName ||
      this._area !== origArea ||
      (this.mainEntity !== undefined && this._deviceClass !== origDeviceClass)
    );
  }

  protected updated(changedProps: Map<string, unknown>) {
    if (
      changedProps.has("_deviceName") ||
      changedProps.has("_area") ||
      changedProps.has("_deviceClass")
    ) {
      fireEvent(this, "device-added-changed", {
        name: this._deviceName,
        area: this._area,
        deviceClass: this._deviceClass,
        hasPendingUpdates: this._hasPendingUpdates,
      });
    }
  }

  private _deviceClassesSorted = memoizeOne(
    (domain: string, deviceClasses: string[]) =>
      deviceClasses
        .map((deviceClass) => ({
          deviceClass,
          label: this.hass.localize(
            `ui.dialogs.entity_registry.editor.device_classes.${domain}.${deviceClass}`
          ),
        }))
        .sort((a, b) =>
          caseInsensitiveStringCompare(
            a.label,
            b.label,
            this.hass.locale.language
          )
        )
  );

  protected render() {
    if (!this.device) return nothing;

    const domain = this.mainEntity
      ? computeDomain(this.mainEntity.entity_id)
      : undefined;
    const deviceClassOptions = this._deviceClassOptions;

    return html`
      <div class="content">
        <div class="device">
          <div class="device-info">
            <img
              alt="Matter"
              src=${brandsUrl(
                {
                  domain: "matter",
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                },
                this.hass.auth.data.hassUrl
              )}
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
            />
            <div class="device-name">
              <span>${computeDeviceName(this.device)}</span>
              <span class="secondary">Matter</span>
            </div>
          </div>
          <ha-input
            .label=${this.hass.localize(
              "ui.panel.config.integrations.config_flow.device_name"
            )}
            .value=${this._deviceName}
            @change=${this._deviceNameChanged}
          ></ha-input>
          <ha-area-picker
            .hass=${this.hass}
            .value=${this._area}
            @value-changed=${this._areaPicked}
          ></ha-area-picker>
          ${deviceClassOptions && domain
            ? html`
                <ha-select
                  .label=${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.device_class"
                  )}
                  .value=${this._deviceClass
                    ? this.hass.localize(
                        `ui.dialogs.entity_registry.editor.device_classes.${domain}.${this._deviceClass}`
                      )
                    : undefined}
                  clearable
                  @selected=${this._deviceClassChanged}
                >
                  ${this._deviceClassesSorted(
                    domain,
                    deviceClassOptions[0]
                  ).map(
                    (entry) => html`
                      <ha-dropdown-item
                        .value=${entry.deviceClass}
                        .selected=${entry.deviceClass === this._deviceClass}
                      >
                        ${entry.label}
                      </ha-dropdown-item>
                    `
                  )}
                  ${deviceClassOptions[0].length && deviceClassOptions[1].length
                    ? html`<wa-divider></wa-divider>`
                    : nothing}
                  ${this._deviceClassesSorted(
                    domain,
                    deviceClassOptions[1]
                  ).map(
                    (entry) => html`
                      <ha-dropdown-item
                        .value=${entry.deviceClass}
                        .selected=${entry.deviceClass === this._deviceClass}
                      >
                        ${entry.label}
                      </ha-dropdown-item>
                    `
                  )}
                </ha-select>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _deviceNameChanged(ev: InputEvent) {
    this._deviceName = (ev.currentTarget as HTMLInputElement).value;
  }

  private _areaPicked(ev: CustomEvent<{ value: string }>) {
    this._area = ev.detail.value || undefined;
  }

  private _deviceClassChanged(ev: HaSelectSelectEvent<string, true>) {
    this._deviceClass = ev.detail.value;
  }

  static styles = [
    sharedStyles,
    css`
      .device {
        border: 1px solid var(--divider-color);
        padding: var(--ha-space-2);
        border-radius: var(--ha-border-radius-sm);
      }
      .device-info {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        margin-bottom: var(--ha-space-1);
      }
      .device-info img {
        width: 40px;
        height: 40px;
      }
      .device-name {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .secondary {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      ha-input {
        margin: var(--ha-space-2) 0;
      }
      ha-area-picker,
      ha-select {
        display: block;
        margin-top: var(--ha-space-2);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-device-added": MatterAddDeviceDeviceAdded;
  }
}
