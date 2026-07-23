import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "./ha-entity-id-format-card";

@customElement("ha-config-section-naming")
export class HaConfigSectionNaming extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render() {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.naming.caption")}
      >
        <div class="content">
          <ha-entity-id-format-card></ha-entity-id-format-card>
        </div>
      </hass-subpage>
    `;
  }

  static styles = css`
    .content {
      padding: var(--ha-space-7) var(--ha-space-5) 0;
      max-width: 1040px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-5);
    }
    ha-entity-id-format-card {
      max-width: 600px;
      margin: 0 auto;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-naming": HaConfigSectionNaming;
  }
}
