import { mdiDotsVertical, mdiDownload } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { getSignedPath } from "../../../data/auth";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import "./ha-config-analytics";

@customElement("ha-config-section-analytics")
class HaConfigSectionAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.analytics.caption")}
      >
        <ha-dropdown
          @wa-select=${this._handleOverflowAction}
          slot="toolbar-icon"
        >
          <ha-icon-button slot="trigger" .path=${mdiDotsVertical}>
          </ha-icon-button>
          <ha-dropdown-item .value=${"download_device_info"}>
            <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.analytics.download_device_info"
            )}
          </ha-dropdown-item>
        </ha-dropdown>
        <div class="content">
          <ha-config-analytics .hass=${this.hass}></ha-config-analytics>
        </div>
      </hass-subpage>
    `;
  }

  private async _handleOverflowAction(
    ev: CustomEvent<{ item: { value: string } }>
  ): Promise<void> {
    if (ev.detail.item.value === "download_device_info") {
      const signedPath = await getSignedPath(
        this.hass,
        "/api/analytics/devices"
      );
      fileDownload(signedPath.path);
    }
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    ha-config-analytics {
      display: block;
      max-width: 600px;
      margin: 0 auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-analytics": HaConfigSectionAnalytics;
  }
}
