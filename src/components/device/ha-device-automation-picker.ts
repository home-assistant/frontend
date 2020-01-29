import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-listbox/paper-listbox";
import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import {
  DeviceAutomation,
  deviceAutomationsEqual,
} from "../../data/device_automation";
import "../../components/ha-paper-dropdown-menu";

const NO_AUTOMATION_KEY = "NO_AUTOMATION";
const UNKNOWN_AUTOMATION_KEY = "UNKNOWN_AUTOMATION";

export abstract class HaDeviceAutomationPicker<
  T extends DeviceAutomation
> extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public label?: string;
  @property() public deviceId?: string;
  @property() public value?: T;
  protected NO_AUTOMATION_TEXT = "No automations";
  protected UNKNOWN_AUTOMATION_TEXT = "Unknown automation";
  @property() private _automations: T[] = [];

  // Trigger an empty render so we start with a clean DOM.
  // paper-listbox does not like changing things around.
  @property() private _renderEmpty = false;

  private _localizeDeviceAutomation: (
    hass: HomeAssistant,
    automation: T
  ) => string;
  private _fetchDeviceAutomations: (
    hass: HomeAssistant,
    deviceId: string
  ) => Promise<T[]>;
  private _createNoAutomation: (deviceId?: string) => T;

  constructor(
    localizeDeviceAutomation: HaDeviceAutomationPicker<
      T
    >["_localizeDeviceAutomation"],
    fetchDeviceAutomations: HaDeviceAutomationPicker<
      T
    >["_fetchDeviceAutomations"],
    createNoAutomation: HaDeviceAutomationPicker<T>["_createNoAutomation"]
  ) {
    super();
    this._localizeDeviceAutomation = localizeDeviceAutomation;
    this._fetchDeviceAutomations = fetchDeviceAutomations;
    this._createNoAutomation = createNoAutomation;
  }

  private get _key() {
    if (
      !this.value ||
      deviceAutomationsEqual(
        this._createNoAutomation(this.deviceId),
        this.value
      )
    ) {
      return NO_AUTOMATION_KEY;
    }

    const idx = this._automations.findIndex((automation) =>
      deviceAutomationsEqual(automation, this.value!)
    );

    if (idx === -1) {
      return UNKNOWN_AUTOMATION_KEY;
    }

    return `${this._automations[idx].device_id}_${idx}`;
  }

  protected render(): TemplateResult {
    if (this._renderEmpty) {
      return html``;
    }
    return html`
      <ha-paper-dropdown-menu
        .label=${this.label}
        .value=${this.value
          ? this._localizeDeviceAutomation(this.hass, this.value)
          : ""}
        ?disabled=${this._automations.length === 0}
      >
        <paper-listbox
          slot="dropdown-content"
          .selected=${this._key}
          attr-for-selected="key"
          @iron-select=${this._automationChanged}
        >
          <paper-item
            key=${NO_AUTOMATION_KEY}
            .automation=${this._createNoAutomation(this.deviceId)}
            hidden
          >
            ${this.NO_AUTOMATION_TEXT}
          </paper-item>
          <paper-item
            key=${UNKNOWN_AUTOMATION_KEY}
            .automation=${this.value}
            hidden
          >
            ${this.UNKNOWN_AUTOMATION_TEXT}
          </paper-item>
          ${this._automations.map(
            (automation, idx) => html`
              <paper-item
                key=${`${this.deviceId}_${idx}`}
                .automation=${automation}
              >
                ${this._localizeDeviceAutomation(this.hass, automation)}
              </paper-item>
            `
          )}
        </paper-listbox>
      </ha-paper-dropdown-menu>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("deviceId")) {
      this._updateDeviceInfo();
    }

    // The value has changed, force the listbox to update
    if (changedProps.has("value") || changedProps.has("_renderEmpty")) {
      const listbox = this.shadowRoot!.querySelector("paper-listbox")!;
      if (listbox) {
        listbox._selectSelected(this._key);
      }
    }
  }

  private async _updateDeviceInfo() {
    this._automations = this.deviceId
      ? await this._fetchDeviceAutomations(this.hass, this.deviceId)
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
    this._setValue(ev.detail.item.automation);
  }

  private _setValue(automation: T) {
    if (this.value && deviceAutomationsEqual(automation, this.value)) {
      return;
    }
    this.value = automation;
    setTimeout(() => {
      fireEvent(this, "change");
      fireEvent(this, "value-changed", { value: automation });
    }, 0);
  }

  static get styles(): CSSResult {
    return css`
      ha-paper-dropdown-menu {
        width: 100%;
      }
      paper-listbox {
        min-width: 200px;
      }
      paper-item {
        cursor: pointer;
      }
    `;
  }
}
