import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { ActionConfig } from "../../data/lovelace/config/action";
import type { UiActionSelector } from "../../data/selector";
import "../../panels/lovelace/components/hui-action-editor";
import type { HomeAssistant } from "../../types";

@customElement("ha-selector-ui_action")
export class HaSelectorUiAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: UiActionSelector;

  @property({ attribute: false }) public value?: ActionConfig;

  @property() public label?: string;

  @property() public helper?: string;

  protected render() {
    return html`
      <hui-action-editor
        .label=${this.label}
        .hass=${this.hass}
        .config=${this.value}
        .actions=${this.selector.ui_action?.actions}
        .defaultAction=${this.selector.ui_action?.default_action}
        .tooltipText=${this.helper}
        @value-changed=${this._valueChanged}
      ></hui-action-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-ui_action": HaSelectorUiAction;
  }
}
