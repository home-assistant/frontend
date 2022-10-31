import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { StatisticSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../entity/ha-statistics-picker";

@customElement("ha-selector-statistic")
export class HaStatisticSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: StatisticSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    if (!this.selector.statistic.multiple) {
      return html`<ha-statistic-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        allow-custom-entity
      ></ha-statistic-picker>`;
    }

    return html`
      ${this.label ? html`<label>${this.label}</label>` : ""}
      <ha-statistics-picker
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-statistics-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-statistic": HaStatisticSelector;
  }
}
