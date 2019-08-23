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
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { compare } from "../../common/string/compare";
import computeStateName from "../../common/entity/compute_state_name";
import {
  DeviceTrigger,
  fetchDeviceTriggers,
  triggersEqual,
} from "../../data/device_automation";

class HaDeviceTriggerPicker extends LitElement {
  public hass?: HomeAssistant;
  @property() public label?: string;
  @property() public deviceId?: string;
  @property() public triggers?: DeviceTrigger[] = [];
  @property() public trigger?: DeviceTrigger;
  @property() public presetTrigger?: DeviceTrigger;
  private noTrigger = { device_id: this.deviceId, platform: "device" };

  private _sortedTriggers = memoizeOne((triggers?: DeviceTrigger[]) => {
    return triggers || [];
  });

  protected render(): TemplateResult | void {
    const noTriggers = this._sortedTriggers(this.triggers).length == 0;
    return html`
      <paper-dropdown-menu-light .label=${this.label} ?disabled=${noTriggers}>
        <paper-listbox
          slot="dropdown-content"
          .selected=${this._trigger}
          attr-for-selected="trigger"
          @iron-select=${this._triggerChanged}
          id="listbox"
        >
          ${noTriggers
            ? html`
                <paper-item .trigger=${this.noTrigger}>
                  No triggers
                </paper-item>
              `
            : ""}
          ${this._sortedTriggers(this.triggers).map(
            (trigger) => html`
              <paper-item .trigger=${trigger}>
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.triggers.type.device.trigger_type.${
                    trigger.type
                  }`,
                  "entity_id",
                  trigger.entity_id
                    ? computeStateName(this.hass.states[trigger.entity_id])
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

  protected updated(changedProps) {
    super.updated(changedProps);

    // Reset trigger if device-id has changed
    if (changedProps.has("deviceId")) {
      this.noTrigger = { device_id: this.deviceId, platform: "device" };
      if (this.deviceId) {
        fetchDeviceTriggers(this.hass!, this.deviceId).then((trigger) => {
          this.triggers = trigger.triggers;
          if (this.triggers.length > 0) {
            // Set first trigger as default
            this.trigger = this.triggers[0];
          } else if (triggersEqual(this.noTrigger, this.presetTrigger)) {
            this.trigger = this.noTrigger;
          }
          for (var trigger of this.triggers) {
            // Try to find a trigger matching existing trigger loaded from stored automation
            if (triggersEqual(trigger, this.presetTrigger))
              this.trigger = trigger;
          }
        });
      } else {
        // No device, clear the list of triggers
        this.triggers = [];
        this.trigger = this.noTrigger;
      }
    }

    // The triggers property has changed, force the listbox to update
    if (changedProps.has("triggers")) {
      this.shadowRoot.getElementById("listbox")._selectSelected();
    }
  }

  private _triggerChanged(ev) {
    const newValue = ev.detail.item.trigger;
    if (newValue !== this._trigger) {
      this.trigger = newValue;
      setTimeout(() => {
        fireEvent(this, "change");
      }, 0);
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: inline-block;
      }
      paper-dropdown-menu-light {
        display: block;
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

customElements.define("ha-device-trigger-picker", HaDeviceTriggerPicker);
