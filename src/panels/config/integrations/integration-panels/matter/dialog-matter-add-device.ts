import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { computeDeviceName } from "../../../../../common/entity/compute_device_name";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-icon-button-arrow-prev";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import {
  commissionMatterDevice,
  watchForNewMatterDevice,
} from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { DeviceRegistryEntry } from "../../../../../data/device/device_registry";
import { updateDeviceRegistryEntry } from "../../../../../data/device/device_registry";
import {
  getAutomaticEntityIds,
  getExtendedEntityRegistryEntries,
  updateEntityRegistryEntry,
  type ExtEntityRegistryEntry,
} from "../../../../../data/entity/entity_registry";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "./matter-add-device/matter-add-device-apple-home";
import "./matter-add-device/matter-add-device-existing";
import "./matter-add-device/matter-add-device-generic";
import "./matter-add-device/matter-add-device-google-home";
import "./matter-add-device/matter-add-device-google-home-fallback";
import "./matter-add-device/matter-add-device-main";
import "./matter-add-device/matter-add-device-new";
import "./matter-add-device/matter-add-device-commissioning";
import "./matter-add-device/matter-add-device-device-added";
import { showToast } from "../../../../../util/toast";

export type MatterAddDeviceStep =
  | "main"
  | "new"
  | "existing"
  | "google_home"
  | "google_home_fallback"
  | "apple_home"
  | "generic"
  | "commissioning"
  | "device_added";

declare global {
  interface HASSDomEvents {
    "step-selected": { step: MatterAddDeviceStep };
    "pairing-code-changed": { code: string };
  }
}

const BACK_STEP: Record<MatterAddDeviceStep, MatterAddDeviceStep | undefined> =
  {
    main: undefined,
    new: "main",
    existing: "main",
    google_home: "existing",
    google_home_fallback: "google_home",
    apple_home: "existing",
    generic: "existing",
    commissioning: undefined,
    device_added: undefined,
  };

@customElement("dialog-matter-add-device")
class DialogMatterAddDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() _pairingCode = "";

  @state() _step: MatterAddDeviceStep = "main";

  @state() private _newDevice?: DeviceRegistryEntry;

  @state() private _mainEntity?: ExtEntityRegistryEntry;

  @state() private _deviceAddedState: {
    name: string;
    area: string | undefined;
    deviceClass: string | undefined;
    hasPendingUpdates: boolean;
  } = {
    name: "",
    area: undefined,
    deviceClass: undefined,
    hasPendingUpdates: false,
  };

  private _mainEntityFetched = false;

  private _unsub?: UnsubscribeFunc;

  public showDialog(): void {
    this._open = true;
    this._unsub = watchForNewMatterDevice(this.hass, (device) => {
      this._newDevice = device;
      this._step = "device_added";
      this._fetchMainEntity();
    });
  }

  public closeDialog(): void {
    this._open = false;
  }

  protected updated(changedProps: Map<string, unknown>): void {
    // Retry fetching main entity when hass updates (entities may not be available immediately)
    if (
      changedProps.has("hass") &&
      this._newDevice &&
      !this._mainEntityFetched
    ) {
      this._fetchMainEntity();
    }
  }

  private async _fetchMainEntity(): Promise<void> {
    if (!this._newDevice || this._mainEntityFetched) return;

    const entityIds = Object.values(this.hass.entities)
      .filter((e) => e.device_id === this._newDevice!.id)
      .map((e) => e.entity_id);

    if (!entityIds.length) return;

    this._mainEntityFetched = true;

    const entries = await getExtendedEntityRegistryEntries(
      this.hass,
      entityIds
    );

    const mainEntry = Object.values(entries).find(
      (e) => e.original_name === null
    );
    if (!mainEntry) return;

    const domain = computeDomain(mainEntry.entity_id);
    if (domain === "cover" || domain === "binary_sensor") {
      this._mainEntity = mainEntry;
    }
  }

  private _dialogClosed(): void {
    this._open = false;
    this._step = "main";
    this._pairingCode = "";
    this._newDevice = undefined;
    this._mainEntity = undefined;
    this._mainEntityFetched = false;
    this._deviceAddedState = {
      name: "",
      area: undefined,
      deviceClass: undefined,
      hasPendingUpdates: false,
    };
    this._unsub?.();
    this._unsub = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _handleStepSelected(ev: CustomEvent) {
    this._step = ev.detail.step;
    this._pairingCode = "";
  }

  private _handlePairingCodeChanged(ev: CustomEvent) {
    this._pairingCode = ev.detail.code;
  }

  private _handleDeviceAddedChanged(
    ev: CustomEvent<{
      name: string;
      area: string | undefined;
      deviceClass: string | undefined;
      hasPendingUpdates: boolean;
    }>
  ) {
    this._deviceAddedState = ev.detail;
  }

  private _back() {
    const backStep = BACK_STEP[this._step];
    if (!backStep) return;
    this._step = backStep;
  }

  private _renderStep() {
    return html`
      <div
        @pairing-code-changed=${this._handlePairingCodeChanged}
        @step-selected=${this._handleStepSelected}
        @device-added-changed=${this._handleDeviceAddedChanged}
        .hass=${this.hass}
      >
        ${dynamicElement(
          `matter-add-device-${this._step.replaceAll("_", "-")}`,
          {
            hass: this.hass,
            device: this._newDevice,
            mainEntity: this._mainEntity,
          }
        )}
      </div>
    `;
  }

  private async _addDevice() {
    const code = this._pairingCode;
    const savedStep = this._step;
    try {
      this._step = "commissioning";
      await commissionMatterDevice(this.hass, code);
    } catch (_err) {
      showToast(this, {
        message: this.hass.localize(
          "ui.dialogs.matter-add-device.add_device_failed"
        ),
        duration: 2000,
      });
      this._step = savedStep;
    }
    // On success, keep showing commissioning spinner until watchForNewMatterDevice fires
  }

  private async _finishDeviceAdded(): Promise<void> {
    const device = this._newDevice!;
    const { name, area, deviceClass, hasPendingUpdates } =
      this._deviceAddedState;

    if (hasPendingUpdates) {
      const origName = computeDeviceName(device) ?? "";
      const nameChanged = name !== origName;
      const origArea = device.area_id ?? undefined;
      const areaChanged = area !== origArea;

      if (nameChanged || areaChanged) {
        await updateDeviceRegistryEntry(this.hass, device.id, {
          ...(nameChanged && { name_by_user: name || null }),
          ...(areaChanged && { area_id: area || null }),
        }).catch((err: Error) =>
          showAlertDialog(this, {
            text: this.hass.localize(
              "ui.panel.config.integrations.config_flow.error_saving_device",
              { error: err.message }
            ),
          })
        );
      }

      if (nameChanged && name) {
        const entityIds = Object.values(this.hass.entities)
          .filter((e) => e.device_id === device.id)
          .map((e) => e.entity_id);

        if (entityIds.length) {
          const mapping = await getAutomaticEntityIds(this.hass, entityIds);
          await Promise.allSettled(
            Object.entries(mapping)
              .filter((entry): entry is [string, string] => !!entry[1])
              .map(([oldId, newId]) =>
                updateEntityRegistryEntry(this.hass, oldId, {
                  new_entity_id: newId,
                }).catch((err: Error) =>
                  showAlertDialog(this, {
                    text: this.hass.localize(
                      "ui.panel.config.integrations.config_flow.error_saving_entity",
                      { error: err.message }
                    ),
                  })
                )
              )
          );
        }
      }

      if (this._mainEntity) {
        const origClass =
          this._mainEntity.device_class ??
          this._mainEntity.original_device_class ??
          undefined;
        if (deviceClass !== origClass) {
          await updateEntityRegistryEntry(
            this.hass,
            this._mainEntity.entity_id,
            { device_class: deviceClass || null }
          ).catch((err: Error) =>
            showAlertDialog(this, {
              text: this.hass.localize(
                "ui.panel.config.integrations.config_flow.error_saving_entity",
                { error: err.message }
              ),
            })
          );
        }
      }
    }

    this.closeDialog();
    navigate(`/config/devices/device/${device.id}`);
  }

  private _renderActions() {
    if (
      this._step === "apple_home" ||
      this._step === "google_home_fallback" ||
      this._step === "generic"
    ) {
      return html`
        <ha-button
          slot="primaryAction"
          @click=${this._addDevice}
          .disabled=${!this._pairingCode}
        >
          ${this.hass.localize("ui.dialogs.matter-add-device.add_device")}
        </ha-button>
      `;
    }
    if (this._step === "new") {
      return html`
        <ha-button slot="primaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.ok")}
        </ha-button>
      `;
    }
    if (this._step === "device_added") {
      return html`
        <ha-button slot="primaryAction" @click=${this._finishDeviceAdded}>
          ${this._deviceAddedState.hasPendingUpdates
            ? this.hass.localize(
                "ui.dialogs.matter-add-device.device_added.finish"
              )
            : this.hass.localize(
                "ui.dialogs.matter-add-device.device_added.skip"
              )}
        </ha-button>
      `;
    }
    return nothing;
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    const title = this.hass.localize(
      `ui.dialogs.matter-add-device.${this._step}.header`
    );

    const hasBackStep = BACK_STEP[this._step];

    const actions = this._renderActions();

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${title}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        ${hasBackStep
          ? html`
              <ha-icon-button-arrow-prev
                slot="headerNavigationIcon"
                .hass=${this.hass}
                @click=${this._back}
              ></ha-icon-button-arrow-prev>
            `
          : nothing}
        ${this._renderStep()}
        ${actions === nothing
          ? nothing
          : html`<ha-dialog-footer slot="footer">
              ${actions}
            </ha-dialog-footer>`}
      </ha-dialog>
    `;
  }

  static styles = [
    haStyleDialog,
    css`
      :host {
        --horizontal-padding: 24px;
      }
      ha-dialog {
        --dialog-content-padding: 0;
      }
      @media all and (max-width: 450px), all and (max-height: 500px) {
        :host {
          --horizontal-padding: 16px;
        }
      }
      .loading {
        padding: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-add-device": DialogMatterAddDevice;
  }
}
