import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import "./ha-config-analytics";

@customElement("ha-config-section-storage")
class HaConfigSectionStorage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
      >
        <div class="content"></div>
      </hass-subpage>
    `;
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-storage": HaConfigSectionStorage;
  }
}
