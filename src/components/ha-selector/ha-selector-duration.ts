import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { DurationSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-duration-input";

@customElement("ha-selector-duration")
export class HaTimeDuration extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: DurationSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    if (!changedProps.has("selector")) {
      return;
    }
    // Set the initial value via event so HA Form is aware
    if (["", undefined].includes(this.value)) {
      fireEvent(this, "value-changed", {
        value: { hours: 0, minutes: 0, seconds: 0 },
      });
    }
  }

  protected render() {
    return html`
      <ha-duration-input
        .label=${this.label}
        .data=${this.value}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-duration-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-duration": HaTimeDuration;
  }
}
