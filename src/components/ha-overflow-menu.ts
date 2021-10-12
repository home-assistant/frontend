import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-button-menu";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-icon-button";
import "./ha-svg-icon";
import { mdiDotsVertical } from "@mdi/js";
import { HomeAssistant } from "../types";

@customElement("ha-overflow-menu")
export class HaOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <div class="ha-overflow-menu">
        <ha-button-menu corner="BOTTOM_START" absolute>
          <mwc-icon-button
            .title=${this.hass.localize("ui.common.menu")}
            .label=${this.hass.localize("ui.common.overflow_menu")}
            slot="trigger"
          >
            <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>

          <slot></slot>
        </ha-button-menu>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
      }

      @media all and (max-width: 500px) {
        :host {
          background: blue;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-overflow-menu": HaOverflowMenu;
  }
}
