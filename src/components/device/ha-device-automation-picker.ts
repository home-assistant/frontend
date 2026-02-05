import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { fullEntitiesContext } from "../../data/context";
import type { DeviceAutomation } from "../../data/device/device_automation";
import {
  deviceAutomationsEqual,
  sortDeviceAutomations,
} from "../../data/device/device_automation";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-generic-picker";
import "../ha-md-select";
import "../ha-md-select-option";
import type { PickerValueRenderer } from "../ha-picker-field";

const NO_AUTOMATION_KEY = "NO_AUTOMATION";

export abstract class HaDeviceAutomationPicker<
  T extends DeviceAutomation,
> extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public deviceId?: string;

  @property({ type: Object }) public value?: T;

  @state() private _automations?: T[];

  // Trigger an empty render so we start with a clean DOM.
  // paper-listbox does not like changing things around.
  @state() private _renderEmpty = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  protected get NO_AUTOMATION_TEXT() {
    return this.hass.localize(
      "ui.panel.config.devices.automation.actions.no_actions"
    );
  }

  private _localizeDeviceAutomation: (
    hass: HomeAssistant,
    entityRegistry: EntityRegistryEntry[],
    automation: T
  ) => string;

  private _fetchDeviceAutomations: (
    hass: HomeAssistant,
    deviceId: string
  ) => Promise<T[]>;

  private _createNoAutomation: (deviceId?: string) => T;

  constructor(
    localizeDeviceAutomation: HaDeviceAutomationPicker<T>["_localizeDeviceAutomation"],
    fetchDeviceAutomations: HaDeviceAutomationPicker<T>["_fetchDeviceAutomations"],
    createNoAutomation: HaDeviceAutomationPicker<T>["_createNoAutomation"]
  ) {
    super();
    this._localizeDeviceAutomation = localizeDeviceAutomation;
    this._fetchDeviceAutomations = fetchDeviceAutomations;
    this._createNoAutomation = createNoAutomation;
  }

  private get _value() {
    if (!this.value || !this._automations) {
      return "";
    }

    if (!this._automations.length) {
      return NO_AUTOMATION_KEY;
    }

    const idx = this._automations.findIndex((automation) =>
      deviceAutomationsEqual(this._entityReg, automation, this.value!)
    );

    if (idx === -1) {
      return this.value.alias || this.value.type || "unknown";
    }

    return `${this._automations[idx].device_id}_${idx}`;
  }

  protected render() {
    if (this._renderEmpty) {
      return nothing;
    }
    const value = this._value;

    return html`<ha-generic-picker
      .hass=${this.hass}
      .label=${this.label}
      .value=${value}
      .disabled=${!this._automations || this._automations.length === 0}
      .getItems=${this._getItems(value, this._automations)}
      @value-changed=${this._automationChanged}
      .valueRenderer=${this._valueRenderer}
      .unknownItemText=${this.hass.localize(
        "ui.panel.config.devices.automation.actions.unknown_action"
      )}
      hide-clear-icon
    >
    </ha-generic-picker>`;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("deviceId")) {
      this._updateDeviceInfo();
    }
  }

  private _getItems = memoizeOne(
    (value: string, automations: T[] | undefined) => {
      if (!automations) {
        return () => undefined;
      }

      const automationListItems = automations.map((automation, idx) => {
        const primary = this._localizeDeviceAutomation(
          this.hass,
          this._entityReg,
          automation
        );
        return {
          id: `${automation.device_id}_${idx}`,
          primary,
        };
      });

      automationListItems.sort((a, b) =>
        caseInsensitiveStringCompare(
          a.primary,
          b.primary,
          this.hass.locale.language
        )
      );

      if (value === NO_AUTOMATION_KEY) {
        automationListItems.unshift({
          id: NO_AUTOMATION_KEY,
          primary: this.NO_AUTOMATION_TEXT,
        });
      }

      return () => automationListItems;
    }
  );

  private _valueRenderer: PickerValueRenderer = (value: string) => {
    const automation = this._automations?.find(
      (a, idx) => value === `${a.device_id}_${idx}`
    );

    const text = automation
      ? this._localizeDeviceAutomation(this.hass, this._entityReg, automation)
      : value === NO_AUTOMATION_KEY
        ? this.NO_AUTOMATION_TEXT
        : value;

    return html`<span slot="headline">${text}</span>`;
  };

  private async _updateDeviceInfo() {
    this._automations = this.deviceId
      ? (await this._fetchDeviceAutomations(this.hass, this.deviceId)).sort(
          sortDeviceAutomations
        )
      : // No device, clear the list of automations
        [];

    // If there is no value, or if we have changed the device ID, reset the value.
    if (!this.value || this.value.device_id !== this.deviceId) {
      this._setValue(
        this._automations.length
          ? this._automations[0]
          : this._createNoAutomation(this.deviceId)
      );
    }
    this._renderEmpty = true;
    await this.updateComplete;
    this._renderEmpty = false;
  }

  private _automationChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value || NO_AUTOMATION_KEY === value) {
      return;
    }
    const [deviceId, idx] = value.split("_");
    const automation = this._automations![idx];
    if (automation.device_id !== deviceId) {
      return;
    }
    this._setValue(automation);
  }

  private _setValue(automation: T) {
    if (
      this.value &&
      deviceAutomationsEqual(this._entityReg, automation, this.value)
    ) {
      return;
    }
    const value = { ...automation };
    delete value.metadata;
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    ha-select {
      display: block;
    }
  `;
}
