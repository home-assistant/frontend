import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant } from "../types";
import { computeRTLDirection } from "../common/util/compute_rtl";
import "./ha-icon-button";

@customElement("ha-icon-button-next")
export class HaIconButtonNext extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @state() private _icon =
    document.dir === "rtl" ? mdiChevronLeft : mdiChevronRight;

  public connectedCallback() {
    super.connectedCallback();
    if (!document.dir) {
      const dir = this.hass ? computeRTLDirection(this.hass) : undefined;
      if (dir === "rtl") {
        this._icon = mdiChevronLeft;
      }
    }
  }

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
    "ha-icon-button-next": HaIconButtonNext;
  }
}
