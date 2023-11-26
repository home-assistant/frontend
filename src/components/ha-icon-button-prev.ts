import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant } from "../types";
import { computeRTLDirection } from "../common/util/compute_rtl";
import "./ha-icon-button";

@customElement("ha-icon-button-prev")
export class HaIconButtonPrev extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @state() private _icon =
    document.dir === "rtl" ? mdiChevronRight : mdiChevronLeft;

  public connectedCallback() {
    super.connectedCallback();
    if (!document.dir) {
      const dir = this.hass ? computeRTLDirection(this.hass) : undefined;
      if (dir === "rtl") {
        this._icon = mdiChevronRight;
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-icon-button
        .disabled=${this.disabled}
        .label=${this.label || this.hass?.localize("ui.common.back") || "Back"}
        .path=${this._icon}
      ></ha-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-prev": HaIconButtonPrev;
  }
}
