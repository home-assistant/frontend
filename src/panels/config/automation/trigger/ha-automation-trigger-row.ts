import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
// tslint:disable-next-line
import { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-menu-button/paper-menu-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { dynamicContentDirective } from "../../../../common/dom/dynamic-content-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import { HomeAssistant } from "../../../../types";

import "./types/ha-automation-trigger-device";
import "./types/ha-automation-trigger-event";
import "./types/ha-automation-trigger-state";
import "./types/ha-automation-trigger-geo_location";
import "./types/ha-automation-trigger-homeassistant";
import "./types/ha-automation-trigger-mqtt";
import "./types/ha-automation-trigger-numeric_state";
import "./types/ha-automation-trigger-sun";
import "./types/ha-automation-trigger-template";
import "./types/ha-automation-trigger-time";
import "./types/ha-automation-trigger-time_pattern";
import "./types/ha-automation-trigger-webhook";
import "./types/ha-automation-trigger-zone";
import { DeviceTrigger } from "../../../../data/device_automation";

const OPTIONS = [
  "device",
  "event",
  "state",
  "geo_location",
  "homeassistant",
  "mqtt",
  "numeric_state",
  "sun",
  "template",
  "time",
  "time_pattern",
  "webhook",
  "zone",
];

export interface ForDict {
  hours?: number | string;
  minutes?: number | string;
  seconds?: number | string;
}

export interface StateTrigger {
  platform: "state";
  entity_id: string;
  from?: string | number;
  to?: string | number;
  for?: string | number | ForDict;
}

export interface MqttTrigger {
  platform: "mqtt";
  topic: string;
  payload?: string;
}

export interface GeoLocationTrigger {
  platform: "geo_location";
  source: "string";
  zone: "string";
  event: "enter" | "leave";
}

export interface HassTrigger {
  platform: "homeassistant";
  event: "start" | "shutdown";
}

export interface NumericStateTrigger {
  platform: "numeric_state";
  entity_id: string;
  above?: number;
  below?: number;
  value_template?: string;
  for?: string | number | ForDict;
}

export interface SunTrigger {
  platform: "sun";
  offset: number;
  event: "sunrise" | "sunset";
}

export interface TimePatternTrigger {
  platform: "time_pattern";
  hours?: number | string;
  minutes?: number | string;
  seconds?: number | string;
}

export interface WebhookTrigger {
  platform: "webhook";
  webhook_id: string;
}

export interface ZoneTrigger {
  platform: "zone";
  entity_id: string;
  zone: string;
  event: "enter" | "leave";
}

export interface TimeTrigger {
  platform: "time";
  at: string;
}

export interface TemplateTrigger {
  platform: "template";
  value_template: string;
}

export interface EventTrigger {
  platform: "event";
  event_type: string;
  event_data: any;
}

export type Trigger =
  | StateTrigger
  | MqttTrigger
  | GeoLocationTrigger
  | HassTrigger
  | NumericStateTrigger
  | SunTrigger
  | TimePatternTrigger
  | WebhookTrigger
  | ZoneTrigger
  | TimeTrigger
  | TemplateTrigger
  | EventTrigger
  | DeviceTrigger;

export interface TriggerElement extends LitElement {
  trigger: Trigger;
}

export const handleChangeEvent = (element: TriggerElement, ev: CustomEvent) => {
  ev.stopPropagation();
  const name = (ev.target as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail.value;

  if ((element.trigger[name] || "") === newVal) {
    return;
  }

  let newTrigger: Trigger;
  if (!newVal) {
    newTrigger = { ...element.trigger };
    delete newTrigger[name];
  } else {
    newTrigger = { ...element.trigger, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newTrigger });
};

@customElement("ha-automation-trigger-row")
export default class HaAutomationTriggerRow extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public trigger!: Trigger;
  @property() private _yamlMode = false;

  protected render() {
    if (!this.trigger) {
      return html``;
    }
    const hasEditor = OPTIONS.includes(this.trigger.platform);
    if (!hasEditor) {
      this._yamlMode = true;
    }
    const selected = OPTIONS.indexOf(this.trigger.platform);
    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-menu">
            <paper-menu-button
              no-animations
              horizontal-align="right"
              horizontal-offset="-5"
              vertical-offset="-5"
              close-on-activate
            >
              <paper-icon-button
                icon="hass:dots-vertical"
                slot="dropdown-trigger"
              ></paper-icon-button>
              <paper-listbox slot="dropdown-content">
                <paper-item @click=${this._switchYamlMode}>
                  ${this._yamlMode
                    ? this.hass.localize(
                        "ui.panel.config.automation.editor.edit_ui"
                      )
                    : this.hass.localize(
                        "ui.panel.config.automation.editor.edit_yaml"
                      )}
                </paper-item>
                <paper-item disabled>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.duplicate"
                  )}
                </paper-item>
                <paper-item @click=${this._onDelete}>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.delete"
                  )}
                </paper-item>
              </paper-listbox>
            </paper-menu-button>
          </div>
          ${this._yamlMode
            ? html`
                <div style="margin-right: 24px;">
                  ${!hasEditor
                    ? html`
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.triggers.unsupported_platform",
                          "platform",
                          this.trigger.platform
                        )}
                      `
                    : ""}
                  <ha-yaml-editor
                    .value=${this.trigger}
                    @value-changed=${this._onYamlChange}
                  ></ha-yaml-editor>
                </div>
              `
            : html`
                <paper-dropdown-menu-light
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.type_select"
                  )}
                  no-animations
                >
                  <paper-listbox
                    slot="dropdown-content"
                    .selected=${selected}
                    @iron-select=${this._typeChanged}
                  >
                    ${OPTIONS.map(
                      (opt) => html`
                        <paper-item .platform=${opt}>
                          ${this.hass.localize(
                            `ui.panel.config.automation.editor.triggers.type.${opt}.label`
                          )}
                        </paper-item>
                      `
                    )}
                  </paper-listbox>
                </paper-dropdown-menu-light>
                <div>
                  ${dynamicContentDirective(
                    `ha-automation-trigger-${this.trigger.platform}`,
                    { hass: this.hass, trigger: this.trigger }
                  )}
                </div>
              `}
        </div>
      </ha-card>
    `;
  }

  private _onDelete() {
    if (
      confirm(
        this.hass.localize(
          "ui.panel.config.automation.editor.triggers.delete_confirm"
        )
      )
    ) {
      fireEvent(this, "value-changed", { value: null });
    }
  }

  private _typeChanged(ev: CustomEvent) {
    const type = ((ev.target as PaperListboxElement)?.selectedItem as any)
      ?.platform;

    if (!type) {
      return;
    }

    const elClass = customElements.get(`ha-automation-trigger-${type}`);

    if (type !== this.trigger.platform) {
      fireEvent(this, "value-changed", {
        value: {
          platform: type,
          ...elClass.defaultConfig,
        },
      });
    }
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _switchYamlMode() {
    this._yamlMode = !this._yamlMode;
  }

  static get styles(): CSSResult {
    return css`
      .card-menu {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 3;
        color: var(--primary-text-color);
      }
      .rtl .card-menu {
        right: auto;
        left: 0;
      }
      .card-menu paper-item {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-row": HaAutomationTriggerRow;
  }
}
