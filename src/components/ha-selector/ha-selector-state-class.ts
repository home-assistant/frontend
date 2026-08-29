import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { StateClassSelector } from "../../data/selector";
import "../ha-state-class-picker";
import { SENSOR_STATE_CLASSES } from "../../data/sensor_entity_constants";

@customElement("ha-selector-state_class")
export class HaStateClassSelector extends LitElement {
  @property({ attribute: false }) public selector!: StateClassSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-state-class-picker
        .value=${this.value}
        .multiple=${this.selector.state_class?.multiple ?? false}
        .state_classes_filter=${this.selector.state_class?.state_classes_filter ?? SENSOR_STATE_CLASSES}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-state-class-picker>
    `;
  }

  static styles = css`
    ha-state-class-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-state_class": HaStateClassSelector;
  }
}
