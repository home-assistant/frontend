import "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
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
import { TemplateBinarySensor } from "../../../../data/binary_sensor";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

@customElement("ha-binary_sensor-form")
class HaBinarySensorForm extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: TemplateBinarySensor;

  @property() private _name!: string;

  @property() private _icon!: string;

  @property() private _device_class?: string;

  @property() private _value?: string;

  @property() private _availability?: string;

  @property() private _entity_picture?: string;

  @property() private _delay_on?: string;

  @property() private _delay_off?: string;

  set item(item: TemplateBinarySensor) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._device_class = item.device_class || "";
      this._value = item.value || "";
      this._availability = item.availability || "";
      this._entity_picture = item.entity_picture || "";
      this._delay_on = item.delay_on || "";
      this._delay_off = item.delay_on || "";
    } else {
      this._name = "";
      this._icon = "";
      this._device_class = "";
      this._value = "";
      this._availability = "";
      this._entity_picture = "";
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
    const nameInvalid = !this._name || this._name.trim() === "";
    const valueInvalid = !this._value || this._value.trim() === "";

    return html`
      <div class="form">
        <paper-input
          .value=${this._name}
          .configValue=${"name"}
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
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
        ></ha-icon-input>
      </div>
    `;

    // return html`
    //   <div class="form">
    //     <paper-input
    //       .value=${this._name}
    //       .configValue=${"name"}
    //       @value-changed=${this._valueChanged}
    //       .label=${this.hass!.localize(
    //         "ui.dialogs.helper_settings.generic.name"
    //       )}
    //       .errorMessage="${this.hass!.localize(
    //         "ui.dialogs.helper_settings.required_error_msg"
    //       )}"
    //       .invalid=${nameInvalid}
    //       dialogInitialFocus
    //     ></paper-input>
    //     <ha-icon-input
    //       .value=${this._icon}
    //       .configValue=${"icon"}
    //       @value-changed=${this._valueChanged}
    //       .label=${this.hass!.localize(
    //         "ui.dialogs.helper_settings.generic.icon"
    //       )}
    //     ></ha-icon-input>
    //     <paper-input
    //       .value=${this._value}
    //       .configValue=${"value"}
    //       @value-changed=${this._valueChanged}
    //       .label=${this.hass!.localize(
    //         "ui.dialogs.helper_settings.generic.value"
    //       )}
    //       .errorMessage="${this.hass!.localize(
    //         "ui.dialogs.helper_settings.required_error_msg"
    //       )}"
    //       .invalid=${valueInvalid}
    //     ></paper-input>
    //     <paper-input
    //       .value=${this._device_class}
    //       .configValue=${"device_class"}
    //       @value-changed=${this._valueChanged}
    //       .label=${this.hass!.localize(
    //         "ui.dialogs.helper_settings.generic.device_class"
    //       )}
    //     ></paper-input>
    //     ${this.hass.userData?.showAdvanced
    //       ? html`
    //           <paper-input
    //             .value=${this._availability}
    //             .configValue=${"availability"}
    //             @value-changed=${this._valueChanged}
    //             .label=${this.hass!.localize(
    //               "ui.dialogs.helper_settings.binary_sensor.availability"
    //             )}
    //           ></paper-input>
    //           <paper-input
    //             .value=${this._entity_picture}
    //             .configValue=${"entity_picture"}
    //             @value-changed=${this._valueChanged}
    //             .label=${this.hass!.localize(
    //               "ui.dialogs.helper_settings.binary_sensor.entity_picture"
    //             )}
    //           ></paper-input>
    //           <paper-input
    //             .value=${this._delay_on}
    //             .configValue=${"delay_on"}
    //             @value-changed=${this._valueChanged}
    //             .label=${this.hass!.localize(
    //               "ui.dialogs.helper_settings.binary_sensor.delay_on"
    //             )}
    //           ></paper-input>
    //           <paper-input
    //             .value=${this._delay_off}
    //             .configValue=${"delay_off"}
    //             @value-changed=${this._valueChanged}
    //             .label=${this.hass!.localize(
    //               "ui.dialogs.helper_settings.binary_sensor.delay_off"
    //             )}
    //           ></paper-input>
    //         `
    //       : ""}
    //   </div>
    // `;
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
