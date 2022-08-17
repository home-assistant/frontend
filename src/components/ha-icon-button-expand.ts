import { mdiChevronDown, mdiChevronUp } from "@mdi/js";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../types";
import "./ha-icon-button";

@customElement("ha-icon-button-expand")
export class HaIconButtonExpand extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public expanded = false;

  protected render(): TemplateResult {
    return html`
      <ha-icon-button
        .disabled=${this.disabled}
        .label=${this.hass?.localize(
          `ui.components.expanding.${this.expanded ? "collapse" : "expand"}`
        )}
        .path=${this.expanded ? mdiChevronUp : mdiChevronDown}
      ></ha-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-expand": HaIconButtonExpand;
  }
}
