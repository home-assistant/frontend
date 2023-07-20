import { consume } from "@lit-labs/context";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { fullEntitiesContext } from "../../data/context";
import {
  DeviceAutomation,
  deviceAutomationsEqual,
  sortDeviceAutomations,
} from "../../data/device_automation";
import { EntityRegistryEntry } from "../../data/entity_registry";
import { HomeAssistant } from "../../types";
import "../ha-select";

const NO_AUTOMATION_KEY = "NO_AUTOMATION";
const UNKNOWN_AUTOMATION_KEY = "UNKNOWN_AUTOMATION";

export abstract class HaDeviceAutomationPicker<
  T extends DeviceAutomation,
> extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public deviceId?: string;

  @property() public value?: T;

  @state() private _automations: T[] = [];

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

  protected get UNKNOWN_AUTOMATION_TEXT() {
    return this.hass.localize(
      "ui.panel.config.devices.automation.actions.unknown_action"
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
    if (!this.value) {
      return "";
    }

    if (!this._automations.length) {
      return NO_AUTOMATION_KEY;
    }

    const idx = this._automations.findIndex((automation) =>
      deviceAutomationsEqual(this._entityReg, automation, this.value!)
    );

    if (idx === -1) {
      return UNKNOWN_AUTOMATION_KEY;
    }

    return `${this._automations[idx].device_id}_${idx}`;
  }

  protected render() {
    if (this._renderEmpty) {
      return nothing;
    }
    const value = this._value;
    return html`
      <ha-select
        .label=${this.label}
        .value=${value}
        @selected=${this._automationChanged}
        .disabled=${this._automations.length === 0}
      >
        ${value === NO_AUTOMATION_KEY
          ? html`<mwc-list-item .value=${NO_AUTOMATION_KEY}>
              ${this.NO_AUTOMATION_TEXT}
            </mwc-list-item>`
          : ""}
        ${value === UNKNOWN_AUTOMATION_KEY
          ? html`<mwc-list-item .value=${UNKNOWN_AUTOMATION_KEY}>
              ${this.UNKNOWN_AUTOMATION_TEXT}
            </mwc-list-item>`
          : ""}
        ${this._automations.map(
          (automation, idx) => html`
            <mwc-list-item .value=${`${automation.device_id}_${idx}`}>
              ${this._localizeDeviceAutomation(
                this.hass,
                this._entityReg,
                automation
              )}
            </mwc-list-item>
          `
        )}
      </ha-select>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("deviceId")) {
      this._updateDeviceInfo();
    }
  }

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

  private _automationChanged(ev) {
    const value = ev.target.value;
    if (!value || [UNKNOWN_AUTOMATION_KEY, NO_AUTOMATION_KEY].includes(value)) {
      return;
    }
    const [deviceId, idx] = value.split("_");
    const automation = this._automations[idx];
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

  static get styles(): CSSResultGroup {
    return css`
      ha-select {
        display: block;
      }
    `;
  }
}
