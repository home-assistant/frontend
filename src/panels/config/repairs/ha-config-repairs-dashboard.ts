import { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item-base";
import { mdiDotsVertical } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../common/navigate";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-card";
import "../../../components/ha-check-list-item";
import {
  RepairsIssue,
  severitySort,
  subscribeRepairsIssueRegistry,
} from "../../../data/repairs";
import "../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import "./ha-config-repairs";
import { showIntegrationStartupDialog } from "./show-integration-startup-dialog";
import { showSystemInformationDialog } from "./show-system-information-dialog";

@customElement("ha-config-repairs-dashboard")
class HaConfigRepairsDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _repairsIssues: RepairsIssue[] = [];

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
        const integrations: Set<string> = new Set();
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
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.repairs.caption")}
      >
        <div slot="toolbar-icon">
          <ha-button-menu multi>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-check-list-item
              left
              @request-selected=${this._toggleIgnored}
              .selected=${this._showIgnored}
            >
              ${this.hass.localize("ui.panel.config.repairs.show_ignored")}
            </ha-check-list-item>
            <li divider role="separator"></li>
            ${isComponentLoaded(this.hass, "system_health") ||
            isComponentLoaded(this.hass, "hassio")
              ? html`
                  <mwc-list-item
                    @request-selected=${this._showSystemInformationDialog}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.repairs.system_information"
                    )}
                  </mwc-list-item>
                `
              : ""}
            <mwc-list-item
              @request-selected=${this._showIntegrationStartupDialog}
            >
              ${this.hass.localize(
                "ui.panel.config.repairs.integration_startup_time"
              )}
            </mwc-list-item>
          </ha-button-menu>
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

  private _showSystemInformationDialog(
    ev: CustomEvent<RequestSelectedDetail>
  ): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    showSystemInformationDialog(this);
  }

  private _showIntegrationStartupDialog(
    ev: CustomEvent<RequestSelectedDetail>
  ): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    showIntegrationStartupDialog(this);
  }

  private _toggleIgnored(ev: CustomEvent<RequestSelectedDetail>): void {
    if (ev.detail.source !== "property") {
      return;
    }

    this._showIgnored = !this._showIgnored;
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
