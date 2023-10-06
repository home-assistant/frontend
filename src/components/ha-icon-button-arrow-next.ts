import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant } from "../types";
import "./ha-icon-button";

@customElement("ha-icon-button-arrow-next")
export class HaIconButtonArrowNext extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @state() private _icon =
    document.dir === "ltr" ? mdiArrowRight : mdiArrowLeft;

  protected render(): TemplateResult {
    return html`
      <ha-icon-button
        .disabled=${this.disabled}
        .label=${this.label || this.hass?.localize("ui.common.next") || "Next"}
        .path=${this._icon}
      ></ha-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-arrow-next": HaIconButtonArrowNext;
  }
}
