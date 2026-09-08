import { consume } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/device/ha-device-action-picker";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/ha-form/ha-form";
import { fullEntitiesContext } from "../../../../../data/context";
import type {
  DeviceAction,
  DeviceCapabilities,
} from "../../../../../data/device/device_automation";
import {
  deviceAutomationEditorMode,
  fetchReplacementDevices,
  fetchDeviceActions,
  deviceAutomationsEqual,
  fetchDeviceActionCapabilities,
  localizeExtraFieldsComputeHelperCallback,
  localizeExtraFieldsComputeLabelCallback,
} from "../../../../../data/device/device_automation";
import {
  fetchDeviceCompositeSplits,
  type DeviceCompositeSplits,
} from "../../../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-action-device_id")
export class HaDeviceAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Object }) public action!: DeviceAction;

  @state() private _deviceId?: string;

  @state() private _capabilities?: DeviceCapabilities;

  @state() private _compositeSplits?: DeviceCompositeSplits;

  @state() private _replacementDeviceIds?: string[];

  private _loadingCompositeSplits = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg: EntityRegistryEntry[] = [];

  private _origAction?: DeviceAction;

  public static get defaultConfig(): DeviceAction {
    return {
      device_id: "",
      domain: "",
      entity_id: "",
    };
  }

  private _extraFieldsData = memoizeOne(
    (action: DeviceAction, capabilities: DeviceCapabilities) => {
      const extraFieldsData: Record<string, any> = {};
      capabilities.extra_fields.forEach((item) => {
        if (action[item.name] !== undefined) {
          extraFieldsData![item.name] = action[item.name];
        }
      });
      return extraFieldsData;
    }
  );

  public shouldUpdate(_changedProperties: PropertyValues<this>) {
    const mode = deviceAutomationEditorMode(
      this.hass,
      this.action.device_id,
      this._compositeSplits
    );
    if (mode === "loading") {
      // The device is missing; wait for the composite split map before deciding
      // whether it is a replaced device (editable) or genuinely unknown (YAML).
      this._loadCompositeSplits();
      return false;
    }
    if (mode === "unknown-device") {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(
          this.hass.localize(
            "ui.panel.config.automation.editor.edit_unknown_device"
          )
        )
      );
      return false;
    }
    return true;
  }

  private async _resolveReplacements(compositeSplits: DeviceCompositeSplits) {
    this._replacementDeviceIds = await fetchReplacementDevices(
      this.hass,
      this._entityReg,
      this.action,
      compositeSplits,
      fetchDeviceActions
    );
  }

  private async _loadCompositeSplits() {
    if (this._loadingCompositeSplits) {
      return;
    }
    this._loadingCompositeSplits = true;
    try {
      // Resolve the candidates before exposing the split map, so the picker
      // never offers one that cannot host the automation.
      const compositeSplits = await fetchDeviceCompositeSplits(this.hass);
      await this._resolveReplacements(compositeSplits);
      this._compositeSplits = compositeSplits;
    } catch (_err) {
      this._compositeSplits = {};
    } finally {
      this._loadingCompositeSplits = false;
    }
  }

  protected render() {
    const deviceId = this._deviceId || this.action.device_id;

    return html`
      <ha-device-picker
        .value=${deviceId}
        .replacementDeviceIds=${this._replacementDeviceIds}
        .disabled=${this.disabled}
        @value-changed=${this._devicePicked}
        .hass=${this.hass}
        label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.device_id.label"
        )}
      ></ha-device-picker>
      <ha-device-action-picker
        .value=${this.action}
        .deviceId=${deviceId}
        .disabled=${this.disabled}
        @value-changed=${this._deviceActionPicked}
        .hass=${this.hass}
        label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.device_id.action"
        )}
      ></ha-device-action-picker>
      ${
        this._capabilities?.extra_fields?.length
          ? html`
              <ha-form
                .hass=${this.hass}
                .data=${this._extraFieldsData(this.action, this._capabilities)}
                .schema=${this._capabilities.extra_fields}
                .disabled=${this.disabled}
                .computeLabel=${localizeExtraFieldsComputeLabelCallback(
                  this.hass.localize,
                  this.action
                )}
                .computeHelper=${localizeExtraFieldsComputeHelperCallback(
                  this.hass.localize,
                  this.action
                )}
                @value-changed=${this._extraFieldsChanged}
              ></ha-form>
            `
          : ""
      }
    `;
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    // The picked device only lives here until the configuration catches up.
    // Once it points somewhere else, undo and redo included, it is stale.
    const previous = changedProps.get("action");
    if (previous && previous.device_id !== this.action.device_id) {
      this._deviceId = undefined;
      this._replacementDeviceIds = undefined;
      if (this._compositeSplits) {
        this._resolveReplacements(this._compositeSplits);
      }
    }
  }

  protected firstUpdated() {
    this.hass.loadBackendTranslation("device_automation");
    if (!this._capabilities) {
      this._getCapabilities();
    }
    if (this.action) {
      this._origAction = this.action;
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    const prevAction = changedProps.get("action");
    if (
      prevAction &&
      !deviceAutomationsEqual(this._entityReg, prevAction, this.action)
    ) {
      this._deviceId = undefined;
      this._getCapabilities();
    }
  }

  private async _getCapabilities() {
    this._capabilities = this.action.domain
      ? await fetchDeviceActionCapabilities(this.hass.callWS, this.action)
      : undefined;
  }

  private _devicePicked(ev) {
    ev.stopPropagation();
    // The automation exists as is on the replacement, so only the reference
    // changes and the rest of the configuration is left untouched.
    if (this._replacementDeviceIds?.includes(ev.target.value)) {
      this._deviceId = undefined;
      fireEvent(this, "value-changed", {
        value: { ...this.action, device_id: ev.target.value },
      });
      return;
    }
    this._deviceId = ev.target.value;
    if (this._deviceId === undefined) {
      fireEvent(this, "value-changed", {
        value: HaDeviceAction.defaultConfig,
      });
    }
  }

  private _deviceActionPicked(ev) {
    ev.stopPropagation();
    let action = ev.detail.value;
    if (
      this._origAction &&
      deviceAutomationsEqual(this._entityReg, this._origAction, action)
    ) {
      action = this._origAction;
    }
    fireEvent(this, "value-changed", { value: action });
  }

  private _extraFieldsChanged(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        ...ev.detail.value,
      },
    });
  }

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--ha-space-3);
    }
    ha-device-picker {
      display: block;
      margin-bottom: 24px;
    }

    ha-device-action-picker {
      display: block;
    }

    ha-form {
      display: block;
      margin-top: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-device_id": HaDeviceAction;
  }
}
