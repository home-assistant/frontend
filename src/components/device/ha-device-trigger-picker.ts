import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
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
import computeStateName from "../../common/entity/compute_state_name";
import {
  DeviceTrigger,
  fetchDeviceTriggers,
  triggersEqual,
} from "../../data/device_automation";

@customElement("ha-device-trigger-picker")
class HaDeviceTriggerPicker extends LitElement {
  public hass?: HomeAssistant;
  @property() public label?: string;
  @property() public deviceId?: string;
  @property() public triggers: { [key: string]: DeviceTrigger } = {};
  public presetTrigger?: DeviceTrigger;

  private noTrigger: DeviceTrigger = {
    device_id: "",
    platform: "device",
    domain: "",
    entity_id: "",
  };
  private unknownTrigger?: DeviceTrigger = {
    device_id: "",
    platform: "device",
    domain: "",
    entity_id: "",
  };
  private key?: string;
  private setTrigger?: DeviceTrigger;

  private readonly NO_TRIGGER = "NO_TRIGGER";
  private readonly UNKNOWN_TRIGGER = "UNKNOWN_TRIGGER";

  protected render(): TemplateResult | void {
    const noTriggers = Object.keys(this.triggers).length === 0;
    return html`
      <paper-dropdown-menu-light .label=${this.label} ?disabled=${noTriggers}>
        <paper-listbox
          slot="dropdown-content"
          .selected=${this.key}
          attr-for-selected="key"
          @iron-select=${this._triggerChanged}
          id="listbox"
        >
          <paper-item .key=${this.NO_TRIGGER} .trigger=${this.noTrigger} hidden>
            No triggers
          </paper-item>
          <paper-item
            .key=${this.UNKNOWN_TRIGGER}
            .trigger=${this.unknownTrigger}
            hidden
          >
            Unknown trigger
          </paper-item>
          ${Object.keys(this.triggers).map(
            (key) => html`
              <paper-item .key=${key} .trigger=${this.triggers[key]}>
                ${this.hass!.localize(
                  `component.${
                    this.triggers[key].domain
                  }.device_automation.trigger_type.${this.triggers[key].type}`,
                  "name",
                  this.triggers[key].entity_id
                    ? computeStateName(
                        this.hass!.states[this.triggers[key].entity_id]
                      )
                    : ""
                )}
              </paper-item>
            `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
    `;
  }

  protected async firstUpdated() {
    this.setTrigger = this.presetTrigger;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("deviceId")) {
      // Reset trigger if device-id has changed
      this.noTrigger = {
        device_id: this.deviceId || "",
        platform: "device",
        domain: "",
        entity_id: "",
      };

      if (this.deviceId) {
        this._updateDeviceInfo();
      } else {
        // No device, clear the list of triggers
        this.triggers = {};
        this.key = this.NO_TRIGGER;
      }
    }

    // The triggers property has changed, force the listbox to update
    if (changedProps.has("triggers" && this.shadowRoot)) {
      const listbox = this.shadowRoot!.querySelector("paper-listbox") as any;
      listbox._selectSelected();
    }
  }

  private async _updateDeviceInfo() {
    const triggers = await this._loadDeviceTriggers();
    this.triggers = {};
    for (let i = 0; i < triggers.length; i++) {
      const key = `${this.deviceId}_${i}`;
      this.triggers[key] = triggers[i];
    }
    // Set to first trigger by default
    this.key =
      Object.keys(this.triggers).length > 0
        ? (this.key = `${this.deviceId}_0`)
        : (this.key = this.NO_TRIGGER);

    if (this.setTrigger && this.setTrigger.device_id === this.deviceId) {
      // Handles the case when the stored automation does not match any trigger reported by the device
      this.unknownTrigger = this.setTrigger;
      this.key = this.UNKNOWN_TRIGGER;
    }
    for (const key of Object.keys(this.triggers)) {
      // Match triggers reported by the device with trigger loaded from stored automation
      if (
        this.setTrigger &&
        triggersEqual(this.triggers[key], this.setTrigger)
      ) {
        this.key = key;
        break;
      }
    }
  }

  private async _loadDeviceTriggers() {
    return fetchDeviceTriggers(this.hass!, this.deviceId || "");
  }

  private _triggerChanged(ev) {
    this.setTrigger = ev.detail.item.trigger;
    setTimeout(() => {
      fireEvent(this, "change");
    }, 0);
  }

  static get styles(): CSSResult {
    return css`
      paper-dropdown-menu-light {
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
