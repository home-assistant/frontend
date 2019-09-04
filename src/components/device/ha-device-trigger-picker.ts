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
  customElement,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import {
  DeviceTrigger,
  fetchDeviceTriggers,
  deviceAutomationTriggersEqual,
  localizeDeviceAutomationTrigger,
} from "../../data/device_automation";
import "../../components/ha-paper-dropdown-menu";

const NO_TRIGGER_KEY = "NO_TRIGGER";
const UNKNOWN_TRIGGER_KEY = "UNKNOWN_TRIGGER";

@customElement("ha-device-trigger-picker")
class HaDeviceTriggerPicker extends LitElement {
  public hass!: HomeAssistant;
  @property() public label?: string;
  @property() public deviceId?: string;
  @property() public value?: DeviceTrigger;
  @property() private _triggers: DeviceTrigger[] = [];

  // Trigger an empty render so we start with a clean DOM.
  // paper-listbox does not like changing things around.
  @property() private _renderEmpty = false;

  private get _key() {
    if (
      !this.value ||
      deviceAutomationTriggersEqual(this._noTrigger, this.value)
    ) {
      return NO_TRIGGER_KEY;
    }

    const idx = this._triggers.findIndex((trigger) =>
      deviceAutomationTriggersEqual(trigger, this.value!)
    );

    if (idx === -1) {
      return UNKNOWN_TRIGGER_KEY;
    }

    return `${this._triggers[idx].device_id}_${idx}`;
  }

  protected render(): TemplateResult | void {
    if (this._renderEmpty) {
      return html``;
    }
    return html`
      <ha-paper-dropdown-menu
        .label=${this.label}
        .value=${this.value
          ? localizeDeviceAutomationTrigger(this.hass, this.value)
          : ""}
        ?disabled=${this._triggers.length === 0}
      >
        <paper-listbox
          slot="dropdown-content"
          .selected=${this._key}
          attr-for-selected="key"
          @iron-select=${this._triggerChanged}
        >
          <paper-item key=${NO_TRIGGER_KEY} .trigger=${this._noTrigger} hidden>
            No triggers
          </paper-item>
          <paper-item key=${UNKNOWN_TRIGGER_KEY} .trigger=${this.value} hidden>
            Unknown trigger
          </paper-item>
          ${this._triggers.map(
            (trigger, idx) => html`
              <paper-item key=${`${this.deviceId}_${idx}`} .trigger=${trigger}>
                ${localizeDeviceAutomationTrigger(this.hass, trigger)}
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
    this._triggers = this.deviceId
      ? await fetchDeviceTriggers(this.hass!, this.deviceId!)
      : // No device, clear the list of triggers
        [];

    // If there is no value, or if we have changed the device ID, reset the value.
    if (!this.value || this.value.device_id !== this.deviceId) {
      this._setValue(
        this._triggers.length ? this._triggers[0] : this._noTrigger
      );
    }
    this._renderEmpty = true;
    await this.updateComplete;
    this._renderEmpty = false;
  }

  private get _noTrigger() {
    return {
      device_id: this.deviceId || "",
      platform: "device",
      domain: "",
      entity_id: "",
    };
  }

  private _triggerChanged(ev) {
    this._setValue(ev.detail.item.trigger);
  }

  private _setValue(trigger: DeviceTrigger) {
    if (this.value && deviceAutomationTriggersEqual(trigger, this.value)) {
      return;
    }
    this.value = trigger;
    setTimeout(() => {
      fireEvent(this, "change");
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-trigger-picker": HaDeviceTriggerPicker;
  }
}
