import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
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
import { LocalizeFunc } from "../../common/translations/localize";
import computeStateName from "../../common/entity/compute_state_name";

export interface DeviceTrigger {
  platform: string;
  domain: string;
  device_id: string;
  entity_id?: string;
  type: string;
}

const fetchDeviceTriggers = (hass, deviceId) =>
  hass.callWS<DeviceTrigger[]>({
    type: "device_automation/list_triggers",
    device_id: deviceId,
  });

function isObject(v) {
  return "[object Object]" === Object.prototype.toString.call(v);
}

JSON.sort = function(o) {
  if (Array.isArray(o)) {
    return o.sort().map(JSON.sort);
  } else if (isObject(o)) {
    return Object.keys(o)
      .sort()
      .reduce(function(a, k) {
        a[k] = JSON.sort(o[k]);

        return a;
      }, {});
  }

  return o;
};

class HaEntityPicker extends LitElement {
  public hass?: HomeAssistant;
  public localize?: LocalizeFunc;
  @property() public label?: string;
  @property() public value?: string;
  @property() public deviceId?: string;
  @property() public triggers?: DeviceTrigger[];

  private _sortedTriggers = memoizeOne((triggers?: DeviceTrigger[]) => {
    return triggers || [];
  });

  protected render(): TemplateResult | void {
    return html`
      <paper-dropdown-menu-light .label=${this.label}>
        <paper-listbox
          slot="dropdown-content"
          .selected=${this._value}
          attr-for-selected="data-trigger"
          @iron-select=${this._triggerChanged}
        >
          <paper-item
            data-trigger=${JSON.stringify({
              device_id: this.deviceId,
              platform: "device",
            })}
          >
            No trigger
          </paper-item>
          ${this._sortedTriggers(this.triggers).map(
            (trigger) => html`
              <paper-item data-trigger=${JSON.stringify(JSON.sort(trigger))}>
                ${this.localize(
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

  private get _value() {
    return this.value || "";
  }

  protected updated(oldProps) {
    console.log("_triggerChanged");
    if (oldProps.has("deviceId") && oldProps.get("deviceId") != this.deviceId) {
      if (this.deviceId) {
        fetchDeviceTriggers(this.hass!, this.deviceId).then((trigger) => {
          this.triggers = trigger.triggers;
        });
      } else {
        this.triggers = [];
      }
    }
  }

  private _triggerChanged(ev) {
    console.log("_triggerChanged");
    const tmp = JSON.parse(ev.detail.item.dataset.trigger);
    const newValue = ev.detail.item.dataset.trigger;
    if (newValue !== this._value) {
      this.value = newValue;
      setTimeout(() => {
        fireEvent(this, "value-changed", { value: newValue });
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
      paper-icon-item {
        cursor: pointer;
      }
    `;
  }
}

customElements.define("ha-device-trigger-picker", HaEntityPicker);
