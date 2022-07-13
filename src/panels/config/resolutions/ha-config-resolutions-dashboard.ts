import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import type { ResolutionIssue } from "../../../data/resolutions";
import { fetchResolutionsIssues } from "../../../data/resolutions";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "./ha-config-resolutions";

@customElement("ha-config-resolutions-dashboard")
class HaConfigResolutionsDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _resolutionIssues: ResolutionIssue[] = [];

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);

    fetchResolutionsIssues(this.hass).then(async (data) => {
      await this.hass.loadBackendTranslation("issues");
      this._resolutionIssues = data.issues;
    });
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.resolutions.caption")}
      >
        <div class="content">
          <ha-card outlined>
            <div class="card-content">
              ${this._resolutionIssues.length
                ? html`
                    <ha-config-resolutions
                      .hass=${this.hass}
                      .narrow=${this.narrow}
                      .resolutionIssues=${this._resolutionIssues}
                    ></ha-config-resolutions>
                  `
                : html`
                    <div class="no-resolutions">
                      ${this.hass.localize(
                        "ui.panel.config.resolutions.no_resolutions"
                      )}
                    </div>
                  `}
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }

    ha-card {
      max-width: 600px;
      margin: 0 auto;
      height: 100%;
      justify-content: space-between;
      flex-direction: column;
      display: flex;
      margin-bottom: max(24px, env(safe-area-inset-bottom));
    }

    .card-content {
      display: flex;
      justify-content: space-between;
      flex-direction: column;
      padding: 0;
    }

    .no-resolutions {
      padding: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-resolutions-dashboard": HaConfigResolutionsDashboard;
  }
}
