import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-icon-picker";
import "../../../../components/input/ha-input";
import type { InputButton } from "../../../../data/input_button";
import { haStyle } from "../../../../resources/styles";

@customElement("ha-input_button-form")
class HaInputButtonForm extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ type: Boolean }) public new = false;

  @property({ type: Boolean }) public disabled = false;

  @state() private _name!: string;

  @state() private _icon!: string;

  @query("[dialogInitialFocus]") private _focusElement?: HTMLElement;

  private _item?: InputButton;

  set item(item: InputButton) {
    this._item = item;
    if (item) {
      this._name = item.name || "";
      this._icon = item.icon || "";
    } else {
      this._name = "";
      this._icon = "";
    }
  }

  public focus() {
    this.updateComplete.then(() => this._focusElement?.focus());
  }

  protected render() {
    if (!this._localize) {
      return nothing;
    }

    return html`
      <div class="form">
        <ha-input
          .value=${this._name}
          .configValue=${"name"}
          @input=${this._valueChanged}
          .label=${this._localize("ui.dialogs.helper_settings.generic.name")}
          auto-validate
          required
          .validationMessage=${this._localize(
            "ui.dialogs.helper_settings.required_error_msg"
          )}
          dialogInitialFocus
          .disabled=${this.disabled}
        ></ha-input>
        <ha-icon-picker
          .value=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
          .label=${this._localize("ui.dialogs.helper_settings.generic.icon")}
          .disabled=${this.disabled}
        ></ha-icon-picker>
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .form {
          color: var(--primary-text-color);
        }
        .row {
          padding: var(--ha-space-4) 0;
        }
        ha-input {
          margin: var(--ha-space-2) 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input_button-form": HaInputButtonForm;
  }
}
