import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../common/dom/fire_event";
import { ensureArray } from "../../common/array/ensure-array";
import type { HomeAssistant } from "../../types";
import "./ha-entity-state-picker";

@customElement("ha-entity-states-picker")
export class HaEntityStatesPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string;

  @property() public attribute?: string;

  @property({ attribute: false }) public extraOptions?: any[];

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property() public label?: string;

  @property({ type: Array }) public value?: string[];

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  private _keys: string[] = [];

  private _getKey(index: number) {
    if (!this._keys[index]) {
      this._keys[index] = Math.random().toString();
    }
    return this._keys[index];
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("value")) {
      this.value = ensureArray(this.value);
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const value = this.value || [];

    return html`
      ${repeat(
        value,
        (_state, index) => this._getKey(index),
        (state, index) => html`
          <div>
            <ha-entity-state-picker
              .index=${index}
              .hass=${this.hass}
              .entityId=${this.entityId}
              .attribute=${this.attribute}
              .extraOptions=${this.extraOptions}
              .excludeOptions=${value.filter((v) => v !== state)}
              .allowCustomValue=${this.allowCustomValue}
              .label=${this.label}
              .value=${state}
              .disabled=${this.disabled}
              .helper=${this.disabled && index === value.length - 1
                ? this.helper
                : undefined}
              @value-changed=${this._valueChanged}
            ></ha-entity-state-picker>
          </div>
        `
      )}
      <div>
        ${this.disabled && value.length
          ? nothing
          : keyed(
              value.length,
              html`<ha-entity-state-picker
                .hass=${this.hass}
                .entityId=${this.entityId}
                .attribute=${this.attribute}
                .extraOptions=${this.extraOptions}
                .excludeOptions=${value}
                .allowCustomValue=${this.allowCustomValue}
                .label=${this.label}
                .helper=${this.helper}
                .disabled=${this.disabled}
                .required=${this.required && !value.length}
                @value-changed=${this._addValue}
              ></ha-entity-state-picker>`
            )}
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newState = ev.detail.value;
    const newValue = [...this.value!];
    const index = (ev.currentTarget as any)?.index;
    if (!index) {
      return;
    }
    if (newState === undefined) {
      newValue.splice(index, 1);
      this._keys.splice(index, 1);
      fireEvent(this, "value-changed", {
        value: newValue,
      });
      return;
    }
    newValue[index] = newState;
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _addValue(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: [...(this.value || []), ev.detail.value],
    });
  }

  static override styles = css`
    div {
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-states-picker": HaEntityStatesPicker;
  }
}
