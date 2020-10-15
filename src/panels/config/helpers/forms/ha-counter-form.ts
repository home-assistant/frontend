import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-input";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import { Counter } from "../../../../data/counter";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

@customElement("ha-counter-form")
class HaCounterForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public new?: boolean;

  private _item?: Partial<Counter>;

  @internalProperty() private _name!: string;

  @internalProperty() private _icon!: string;

  @internalProperty() private _maximum?: number;

  @internalProperty() private _minimum?: number;

  @internalProperty() private _restore?: boolean;

  @internalProperty() private _initial?: number;

  @internalProperty() private _step?: number;

  set item(item: Counter) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._maximum = item.maximum;
      this._minimum = item.minimum;
      this._restore = item.restore ?? true;
      this._step = item.step ?? 1;
      this._initial = item.initial ?? 0;
    } else {
      this._name = "";
      this._icon = "";
      this._maximum = undefined;
      this._minimum = undefined;
      this._restore = true;
      this._step = 1;
      this._initial = 0;
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
        <paper-input
          .value=${this._minimum}
          .configValue=${"minimum"}
          type="number"
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.counter.minimum"
          )}
        ></paper-input>
        <paper-input
          .value=${this._maximum}
          .configValue=${"maximum"}
          type="number"
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.counter.maximum"
          )}
        ></paper-input>
        <paper-input
          .value=${this._initial}
          .configValue=${"initial"}
          type="number"
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.counter.initial"
          )}
        ></paper-input>
        ${this.hass.userData?.showAdvanced
          ? html`
              <paper-input
                .value=${this._step}
                .configValue=${"step"}
                type="number"
                @value-changed=${this._valueChanged}
                .label=${this.hass!.localize(
                  "ui.dialogs.helper_settings.counter.step"
                )}
              ></paper-input>
              <div class="row">
                <ha-switch
                  .checked=${this._restore}
                  .configValue=${"restore"}
                  @change=${this._valueChanged}
                >
                </ha-switch>
                <div>
                  ${this.hass.localize(
                    "ui.dialogs.helper_settings.counter.restore"
                  )}
                </div>
              </div>
            `
          : ""}
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }
    ev.stopPropagation();
    const target = ev.target as any;
    const configValue = target.configValue;
    const value =
      target.type === "number"
        ? Number(ev.detail.value)
        : target.localName === "ha-switch"
        ? (ev.target as HaSwitch).checked
        : ev.detail.value;
    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (value === undefined || value === "") {
      delete newValue[configValue];
    } else {
      newValue[configValue] = value;
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
          margin-top: 12px;
          margin-bottom: 12px;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
        }
        .row div {
          margin-left: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-counter-form": HaCounterForm;
  }
}
