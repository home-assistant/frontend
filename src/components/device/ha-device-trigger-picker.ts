import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-listbox/paper-listbox";
import memoizeOne from "memoize-one";
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
  private noTrigger: DeviceTrigger = {};
  private unknownTrigger: DeviceTrigger = {};
  private trigger?: DeviceTrigger;
  private setTrigger?: DeviceTrigger;

  public hass?: HomeAssistant;
  @property() public label?: string;
  @property() public deviceId?: string;
  @property() public triggers: DeviceTrigger[] = [];
  public presetTrigger?: DeviceTrigger;

  private _sortedTriggers = memoizeOne((triggers?: DeviceTrigger[]) => {
    return triggers || [];
  });

  protected render(): TemplateResult | void {
    const noTriggers = this._sortedTriggers(this.triggers).length === 0;
    return html`
      <paper-dropdown-menu-light .label=${this.label} ?disabled=${noTriggers}>
        <paper-listbox
          slot="dropdown-content"
          .selected=${this._trigger}
          attr-for-selected="trigger"
          @iron-select=${this._triggerChanged}
          id="listbox"
        >
          <paper-item .trigger=${this.noTrigger} hidden>
            No triggers
          </paper-item>
          <paper-item .trigger=${this.unknownTrigger} hidden>
            Unknown trigger
          </paper-item>
          ${this._sortedTriggers(this.triggers).map(
            (trigger) => html`
              <paper-item .trigger=${trigger}>
                ${this.hass!.localize(
                  `ui.panel.config.automation.editor.triggers.type.device.trigger_type.${
                    trigger.type
                  }`,
                  "entity_id",
                  trigger.entity_id
                    ? computeStateName(this.hass!.states[trigger.entity_id])
                    : "",
                  "event",
                  trigger.event
                )}
              </paper-item>
            `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
    `;
  }

  private get _trigger() {
    return this.trigger;
  }

  protected async firstUpdated(changedProps) {
    this.setTrigger = this.presetTrigger;
  }

  protected async updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("deviceId")) {
      // Reset trigger if device-id has changed
      this.noTrigger = { device_id: this.deviceId || "", platform: "device" };

      if (this.deviceId) {
        const response = await this._loadDeviceTriggers();
        this.triggers = response.triggers;
        if (this.triggers.length > 0) {
          // Set first trigger as default
          this.trigger = this.triggers[0];
        } else {
          this.trigger = this.noTrigger;
        }
        if (this.setTrigger.device_id === this.deviceId) {
          // Handles the case when the stored automation does not match any trigger reported by the device
          this.trigger = this.unknownTrigger = this.setTrigger;
        }
        for (const trig of this.triggers) {
          // Match triggers reported by the device with trigger loaded from stored automation
          if (triggersEqual(trig, this.setTrigger)) {
            this.trigger = trig;
          }
        }
      } else {
        // No device, clear the list of triggers
        this.triggers = [];
        this.trigger = this.noTrigger;
      }
    }

    // The triggers property has changed, force the listbox to update
    if (changedProps.has("triggers")) {
      const listbox = this.shadowRoot!.getElementById("listbox") as any;
      listbox._selectSelected();
    }
  }

  private async _loadDeviceTriggers() {
    return fetchDeviceTriggers(this.hass!, this.deviceId || "");
  }

  private _triggerChanged(ev) {
    const newValue = ev.detail.item.trigger;
    this.setTrigger = newValue;
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
