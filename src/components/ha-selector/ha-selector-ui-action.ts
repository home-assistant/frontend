import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { ActionConfig } from "../../data/lovelace/config/action";
import { UiActionSelector } from "../../data/selector";
import "../../panels/lovelace/components/hui-action-editor";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-ui_action")
export class HaSelectorUiAction extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: UiActionSelector;

  @property() public value?: ActionConfig;

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
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-ui-action": HaSelectorUiAction;
  }
}
