import "@home-assistant/webawesome/dist/components/divider/divider";
import { mdiDotsVertical } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { navigate } from "../../../common/navigate";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import type { RepairsIssue } from "../../../data/repairs";
import {
  severitySort,
  subscribeRepairsIssueRegistry,
} from "../../../data/repairs";
import "../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import "./ha-config-repairs";
import { showIntegrationStartupDialog } from "./show-integration-startup-dialog";
import { showSystemInformationDialog } from "./show-system-information-dialog";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

@customElement("ha-config-repairs-dashboard")
class HaConfigRepairsDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _repairsIssues: RepairsIssue[] = [];

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _showIgnored = false;

  private _getFilteredIssues = memoizeOne(
    (showIgnored: boolean, repairsIssues: RepairsIssue[]) =>
      showIgnored
        ? repairsIssues
        : repairsIssues.filter((issue) => !issue.ignored)
  );

  public connectedCallback(): void {
    super.connectedCallback();

    const searchParam = extractSearchParam("dialog");

    if (searchParam === "system-health") {
      navigate("/config/repairs", { replace: true });
      showSystemInformationDialog(this);
    }
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeRepairsIssueRegistry(this.hass.connection!, (repairs) => {
        this._repairsIssues = repairs.issues.sort(
          (a, b) => severitySort[a.severity] - severitySort[b.severity]
        );
        const integrations = new Set<string>();
        for (const issue of this._repairsIssues) {
          integrations.add(issue.domain);
        }
        this.hass.loadBackendTranslation("issues", [...integrations]);
      }),
    ];
  }

  protected render(): TemplateResult {
    const issues = this._getFilteredIssues(
      this._showIgnored,
      this._repairsIssues
    );

    return html`
      <hass-subpage
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config/system"}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.repairs.caption")}
      >
        <div slot="toolbar-icon">
          <ha-dropdown @wa-select=${this._handleDropdownSelect}>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-dropdown-item
              type="checkbox"
              value="toggle_ignored"
              .checked=${this._showIgnored}
            >
              ${this.hass.localize("ui.panel.config.repairs.show_ignored")}
            </ha-dropdown-item>
            <wa-divider></wa-divider>
            ${isComponentLoaded(this.hass, "system_health") ||
            isComponentLoaded(this.hass, "hassio")
              ? html`
                  <ha-dropdown-item value="system_information">
                    ${this.hass.localize(
                      "ui.panel.config.repairs.system_information"
                    )}
                  </ha-dropdown-item>
                `
              : nothing}
            <ha-dropdown-item value="integration_startup_time">
              ${this.hass.localize(
                "ui.panel.config.repairs.integration_startup_time"
              )}
            </ha-dropdown-item>
          </ha-dropdown>
        </div>
        <div class="content">
          <ha-card outlined>
            <div class="card-content">
              ${issues.length
                ? html`
                    <ha-config-repairs
                      .hass=${this.hass}
                      .narrow=${this.narrow}
                      .repairsIssues=${issues}
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

  private _showSystemInformationDialog(): void {
    showSystemInformationDialog(this);
  }

  private _showIntegrationStartupDialog(): void {
    showIntegrationStartupDialog(this);
  }

  private _toggleIgnored(): void {
    this._showIgnored = !this._showIgnored;
  }

  private _handleDropdownSelect(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item?.value;

    switch (action) {
      case "toggle_ignored":
        this._toggleIgnored();
        break;
      case "system_information":
        this._showSystemInformationDialog();
        break;
      case "integration_startup_time":
        this._showIntegrationStartupDialog();
        break;
    }
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
      margin-bottom: max(24px, var(--safe-area-inset-bottom));
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
    li[divider] {
      border-bottom-color: var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-repairs-dashboard": HaConfigRepairsDashboard;
  }
}
