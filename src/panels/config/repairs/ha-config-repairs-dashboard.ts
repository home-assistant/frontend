import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import type { RepairsIssue } from "../../../data/repairs";
import { fetchRepairsIssues } from "../../../data/repairs";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "./ha-config-repairs";

@customElement("ha-config-repairs-dashboard")
class HaConfigRepairsDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _repairsIssues: RepairsIssue[] = [];

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._fetchIssues();
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.repairs.caption")}
      >
        <div class="content">
          <ha-card outlined>
            <div class="card-content">
              ${this._repairsIssues.length
                ? html`
                    <ha-config-repairs
                      .hass=${this.hass}
                      .narrow=${this.narrow}
                      .repairsIssues=${this._repairsIssues}
                      @update-issues=${this._fetchIssues}
                    ></ha-config-repairs>
                  `
                : html`
                    <div class="no-repairs">
                      ${this.hass.localize(
                        "ui.panel.config.repairs.no_repairs"
                      )}
                    </div>
                  `}
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchIssues(): Promise<void> {
    const [, repairsIssues] = await Promise.all([
      this.hass.loadBackendTranslation("issues"),
      fetchRepairsIssues(this.hass),
    ]);

    this._repairsIssues = repairsIssues.issues;
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

    .no-repairs {
      padding: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-repairs-dashboard": HaConfigRepairsDashboard;
  }
}
