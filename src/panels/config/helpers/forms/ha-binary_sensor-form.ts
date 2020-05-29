import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";
import "../../../../components/ha-combo-box";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-input";
import "../../../../components/ha-switch";
import { DEVICE_CLASSES } from "../../../../data/binary_sensor";
import { TemplateBinarySensor } from "../../../../data/template.binary_sensor";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

@customElement("ha-binary_sensor-form")
class HaBinarySensorForm extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: TemplateBinarySensor;

  @property() private _friendly_name!: string;

  @property() private _icon_template!: string;

  @property() private _device_class?: string;

  @property() private _value_template?: string;

  @property() private _availability_template?: string;

  @property() private _entity_picture_template?: string;

  @property() private _delay_on?: string;

  @property() private _delay_off?: string;

  set item(item: TemplateBinarySensor) {
    this._item = item;
    if (item) {
      this._friendly_name = item.friendly_name || "";
      this._icon_template = item.icon_template || "";
      this._device_class = item.device_class || "";
      this._value_template = item.value_template || "";
      this._availability_template = item.availability_template || "";
      this._entity_picture_template = item.entity_picture_template || "";
      this._delay_on = item.delay_on || "";
      this._delay_off = item.delay_off || "";
    } else {
      this._friendly_name = "";
      this._icon_template = "";
      this._device_class = "";
      this._value_template = "";
      this._availability_template = "";
      this._entity_picture_template = "";
      this._delay_on = "";
      this._delay_off = "";
    }
  }

  public focus() {
    this.updateComplete.then(() =>
      (this.shadowRoot?.querySelector(
        "[dialogInitialFocus]"
      ) as HTMLElement)?.focus()
    );
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    const selected = this._device_class
      ? DEVICE_CLASSES.indexOf(this._device_class)
      : -1;

    const nameInvalid =
      !this._friendly_name || this._friendly_name.trim() === "";
    const valueInvalid =
      !this._value_template || this._value_template.trim() === "";

    return html`
      <div class="form">
        <paper-input
          .value=${this._friendly_name}
          .configValue=${"friendly_name"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          .errorMessage="${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}"
          .invalid=${nameInvalid}
          dialogInitialFocus
        ></paper-input>
        <ha-icon-input
          .value=${this._icon_template}
          .configValue=${"icon_template"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon_template"
          )}
        ></ha-icon-input>
        <paper-textarea
          .value=${this._value_template}
          .configValue=${"value_template"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.value_template"
          )}
          .errorMessage="${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}"
          .invalid=${valueInvalid}
          @keydown=${this._preventSubmit}
        ></paper-textarea>
        <paper-dropdown-menu-light
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.device_class"
          )}
        >
          <paper-listbox
            slot="dropdown-content"
            @iron-select=${this._deviceValueChanged}
            .selected=${selected}
          >
            ${DEVICE_CLASSES.map(
              (option) => html`
                <paper-item .device_class=${option}>
                  ${this.hass.localize(
                    `ui.dialogs.helper_settings.binary_sensor.device_class.${option}`
                  )}
                </paper-item>
              `
            )}
          </paper-listbox>
        </paper-dropdown-menu-light>
        ${this.hass.userData?.showAdvanced
          ? html`
              <paper-input
                .value=${this._availability_template}
                .configValue=${"availability_template"}
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.binary_sensor.availability_template"
                )}
              ></paper-input>
              <paper-input
                .value=${this._entity_picture_template}
                .configValue=${"entity_picture_template"}
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.binary_sensor.entity_picture_template"
                )}
              ></paper-input>
              <paper-input
                .value=${this._delay_on}
                .configValue=${"delay_on"}
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.binary_sensor.delay_on"
                )}
              ></paper-input>
              <paper-input
                .value=${this._delay_off}
                .configValue=${"delay_off"}
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.binary_sensor.delay_off"
                )}
              ></paper-input>
            `
          : ""}
      </div>
    `;
  }

  private _preventSubmit(ev: KeyboardEvent) {
    if (ev.keyCode === 13) {
      ev.stopPropagation();
    }
  }

  private _deviceValueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }

    const device_class = ((ev.target as PaperListboxElement)
      ?.selectedItem as any)?.device_class;

    if (device_class === this._device_class) {
      return;
    }

    const newValue = { ...this._item };
    if (!device_class) {
      delete newValue.device_class;
    } else {
      newValue.device_class = device_class;
    }

    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }
    ev.stopPropagation();
    const configValue = (ev.target as any).configValue;
    const value = ev.detail.value;
    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (!value) {
      delete newValue[configValue];
    } else {
      newValue[configValue] = ev.detail.value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .form {
          color: var(--primary-text-color);
        }
        .row {
          padding: 16px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-binary_sensor-form": HaBinarySensorForm;
  }
}
