import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ServiceAction } from "../../data/script";
import { ServiceSelector } from "../../data/selector";
import "../../panels/config/automation/action/types/ha-automation-action-service";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-service")
export class HaServiceSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: ServiceSelector;

  @property() public value?: ServiceAction;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected render() {
    return html`
      <ha-automation-action-service
        .disabled=${this.disabled}
        .action=${this.value || []}
        .hass=${this.hass}
      ></ha-automation-action-service>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-action-service {
        display: block;
        margin-bottom: 16px;
      }
      :host([disabled]) ha-automation-action-service {
        opacity: var(--light-disabled-opacity);
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-service": HaServiceSelector;
  }
}
