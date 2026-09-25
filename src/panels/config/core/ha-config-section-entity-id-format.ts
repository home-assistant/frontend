import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "./ha-config-entity-id-format";

@customElement("ha-config-section-entity-id-format")
export class HaConfigSectionEntityIdFormat extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render() {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.entity_id_format.caption"
        )}
      >
        <div class="content">
          <ha-config-entity-id-format></ha-config-entity-id-format>
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
    ha-config-entity-id-format {
      max-width: 600px;
      margin: 0 auto;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-entity-id-format": HaConfigSectionEntityIdFormat;
  }
}
