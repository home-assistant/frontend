import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-duration-input";
import "../../../../components/ha-textfield";
import type { DurationDict, Timer } from "../../../../data/timer";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { createDurationData } from "../../../../common/datetime/create_duration_data";
import type { HaDurationData } from "../../../../components/ha-duration-input";
import type { ForDict } from "../../../../data/automation";

@customElement("ha-timer-form")
class HaTimerForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public new = false;

  private _item?: Timer;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _duration!: string | number | DurationDict;

  @state() private _duration_data!: HaDurationData | undefined;

  @state() private _restore!: boolean;

  set item(item: Timer) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
      this._duration = item.duration || "00:00:00";
      this._restore = item.restore || false;
    } else {
      this._name = "";
      this._icon = "";
      this._duration = "00:00:00";
      this._restore = false;
    }

    this._setDurationData();
  }

  public focus() {
    this.updateComplete.then(() =>
      (
        this.shadowRoot?.querySelector("[dialogInitialFocus]") as HTMLElement
      )?.focus()
    );
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="form">
        <ha-textfield
          .value=${this._name}
          .configValue=${"name"}
          @input=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.name"
          )}
          autoValidate
          required
          .validationMessage=${this.hass!.localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          dialogInitialFocus
        ></ha-textfield>
        <ha-icon-picker
          .hass=${this.hass}
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this.hass!.localize(
            "ui.dialogs.helper_settings.generic.icon"
          )}
        ></ha-icon-picker>
        <ha-duration-input
          .configValue=${"duration"}
          .data=${this._duration_data}
          @value-changed=${this._valueChanged}
        ></ha-duration-input>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.dialogs.helper_settings.timer.restore"
          )}
        >
          <ha-checkbox
            .configValue=${"restore"}
            .checked=${this._restore}
            @click=${this._toggleRestore}
          >
          </ha-checkbox>
        </ha-formfield>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }
    ev.stopPropagation();
    const configValue = (ev.target as any).configValue;
    const value = ev.detail?.value || (ev.target as any).value;
    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (!value) {
      delete newValue[configValue];
    } else {
      newValue[configValue] = value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _toggleRestore() {
    this._restore = !this._restore;
    fireEvent(this, "value-changed", {
      value: { ...this._item, restore: this._restore },
    });
  }

  private _setDurationData() {
    let durationInput: string | number | ForDict;

    if (typeof this._duration === "object" && this._duration !== null) {
      const d = this._duration as DurationDict;
      durationInput = {
        hours: typeof d.hours === "string" ? parseFloat(d.hours) : d.hours,
        minutes:
          typeof d.minutes === "string" ? parseFloat(d.minutes) : d.minutes,
        seconds:
          typeof d.seconds === "string" ? parseFloat(d.seconds) : d.seconds,
      };
    } else {
      durationInput = this._duration;
    }

    this._duration_data = createDurationData(durationInput);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .form {
          color: var(--primary-text-color);
        }
        ha-textfield,
        ha-duration-input {
          display: block;
          margin: 8px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-timer-form": HaTimerForm;
  }
}
