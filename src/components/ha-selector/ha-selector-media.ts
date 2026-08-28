import { html, LitElement, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import type { MediaSelector, MediaSelectorValue } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-media-item-picker";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-selector-media")
export class HaMediaSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: MediaSelector;

  @property({ attribute: false }) public value?:
    MediaSelectorValue | MediaSelectorValue[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean, reflect: true }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_entity?: string | string[];
  };

  private _renderPicker(
    helper?: string,
    value?: MediaSelectorValue,
    index?: number,
    changeCallback?
  ): TemplateResult {
    return html`<ha-media-item-picker
      .hass=${this.hass}
      .context=${this.context}
      .selector=${this.selector}
      .value=${value}
      .label=${index == null ? this.label : undefined}
      .helper=${helper}
      .disabled=${this.disabled}
      .required=${this.required}
      .multiple=${index != null}
      @value-changed=${changeCallback}
      .idx=${index}
    ></ha-media-item-picker>`;
  }

  private _multiValueChanged = (event: CustomEvent) => {
    event.stopPropagation();
    const target = event.currentTarget as any;
    if (!target) return;
    const idx = target.idx;
    let newValue: MediaSelectorValue[] | undefined;
    if (idx === undefined) return;
    if (!this.value || !Array.isArray(this.value)) {
      newValue = event.detail.value ? [event.detail.value] : undefined;
    } else {
      newValue = [...this.value];
      if (event.detail.value) {
        if (idx > this.value.length) {
          newValue.push(event.detail.value);
        } else {
          newValue[idx] = event.detail.value;
        }
      } else {
        newValue.splice(idx, 1);
        if (newValue.length === 0) {
          newValue = undefined;
        }
      }
    }
    fireEvent(this, "value-changed", { value: newValue });
  };

  protected render() {
    if (this.selector.media?.multiple) {
      const value = ensureArray(this.value);
      const result: TemplateResult[] = this.label
        ? [html`<label>${this.label}</label>`]
        : [];
      if (value) {
        result.push(
          ...value.map((v, i) =>
            this._renderPicker(undefined, v, i, this._multiValueChanged)
          )
        );
      }
      result.push(
        this._renderPicker(
          this.helper,
          undefined,
          value?.length || 0,
          this._multiValueChanged
        )
      );
      return result;
    }

    return this._renderPicker(
      this.helper,
      Array.isArray(this.value) ? this.value[0] : this.value
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-media": HaMediaSelector;
  }
}
