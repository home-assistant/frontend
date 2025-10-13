import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { relativeTime } from "../../../common/datetime/relative_time";
import { capitalizeFirstLetter } from "../../../common/string/capitalize-first-letter";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import { domainToName } from "../../../data/integration";
import {
  fetchRepairsIssueData,
  type RepairsIssue,
} from "../../../data/repairs";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { fixStatisticsIssue } from "../../developer-tools/statistics/fix-statistics";
import { showRepairsFlowDialog } from "./show-dialog-repair-flow";
import { showRepairsIssueDialog } from "./show-repair-issue-dialog";
import type { StatisticsValidationResult } from "../../../data/recorder";
import {
  STATISTIC_TYPES,
  updateStatisticsIssues,
} from "../../../data/recorder";

@customElement("ha-config-repairs")
class HaConfigRepairs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false })
  public repairsIssues?: RepairsIssue[];

  @property({ type: Number })
  public total?: number;

  protected render() {
    if (!this.repairsIssues?.length) {
      return nothing;
    }

    const issues = this.repairsIssues;

    return html`
      <div class="title" role="heading" aria-level="2">
        ${this.hass.localize("ui.panel.config.repairs.title", {
          count: this.total || this.repairsIssues.length,
        })}
      </div>
      <ha-md-list>
        ${issues.map((issue) => {
          const domainName = domainToName(this.hass.localize, issue.domain);

          const createdBy =
            issue.created && domainName
              ? this.hass.localize("ui.panel.config.repairs.created_at_by", {
                  date: capitalizeFirstLetter(
                    relativeTime(new Date(issue.created), this.hass.locale)
                  ),
                  integration: domainName,
                })
              : "";

          return html`
            <ha-md-list-item
              .hasMeta=${!this.narrow}
              .issue=${issue}
              class=${issue.ignored ? "ignored" : ""}
              @click=${this._openShowMoreDialog}
              type="button"
            >
              <img
                slot="start"
                alt=${domainName}
                loading="lazy"
                src=${brandsUrl({
                  domain: issue.issue_domain || issue.domain,
                  type: "icon",
                  useFallback: true,
                  darkOptimized: this.hass.themes?.darkMode,
                })}
                .title=${domainName}
                crossorigin="anonymous"
                referrerpolicy="no-referrer"
              />
              <span slot="headline">
                ${this.hass.localize(
                  `component.${issue.domain}.issues.${issue.translation_key || issue.issue_id}.title`,
                  issue.translation_placeholders || {}
                ) ||
                `${issue.domain}: ${issue.translation_key || issue.issue_id}`}
              </span>
              <span slot="supporting-text">
                ${issue.severity === "critical" || issue.severity === "error"
                  ? html`<span class="error"
                      >${this.hass.localize(
                        `ui.panel.config.repairs.${issue.severity}`
                      )}</span
                    >`
                  : ""}
                ${(issue.severity === "critical" ||
                  issue.severity === "error") &&
                issue.created
                  ? " · "
                  : ""}
                ${createdBy
                  ? html`<span .title=${createdBy}>${createdBy}</span>`
                  : nothing}
                ${issue.ignored
                  ? ` · ${this.hass.localize(
                      "ui.panel.config.repairs.dialog.ignored_in_version_short",
                      { version: issue.dismissed_version }
                    )}`
                  : ""}
              </span>
              ${!this.narrow
                ? html`<ha-icon-next slot="end"></ha-icon-next>`
                : ""}
            </ha-md-list-item>
          `;
        })}
      </ha-md-list>
    `;
  }

  private async _openShowMoreDialog(ev): Promise<void> {
    const issue = ev.currentTarget.issue as RepairsIssue;
    if (issue.is_fixable) {
      showRepairsFlowDialog(this, issue);
    } else if (
      issue.domain === "homeassistant" &&
      issue.translation_key === "config_entry_reauth"
    ) {
      const data = await fetchRepairsIssueData(
        this.hass.connection,
        issue.domain,
        issue.issue_id
      );
      if ("flow_id" in data.issue_data) {
        showConfigFlowDialog(this, {
          continueFlowId: data.issue_data.flow_id as string,
        });
      }
    } else if (
      issue.domain === "sensor" &&
      issue.translation_key &&
      STATISTIC_TYPES.includes(issue.translation_key as any)
    ) {
      this.hass.loadFragmentTranslation("developer-tools");
      const data = await fetchRepairsIssueData(
        this.hass.connection,
        issue.domain,
        issue.issue_id
      );
      if ("issue_type" in data.issue_data) {
        await fixStatisticsIssue(this, {
          type: data.issue_data
            .issue_type as StatisticsValidationResult["type"],
          data: data.issue_data as any,
        });
        updateStatisticsIssues(this.hass);
      }
    } else {
      showRepairsIssueDialog(this, {
        issue,
      });
    }
  }

  static styles = css`
    :host {
      --mdc-list-vertical-padding: 0;
    }
    .title {
      font-size: var(--ha-font-size-l);
      padding: 16px;
      padding-bottom: 0;
    }
    .ignored {
      opacity: var(--light-secondary-opacity);
    }
    button.show-more {
      color: var(--primary-color);
      text-align: left;
      cursor: pointer;
      background: none;
      border-width: initial;
      border-style: none;
      border-color: initial;
      border-image: initial;
      padding: 16px;
      font: inherit;
    }
    button.show-more:focus {
      outline: none;
      text-decoration: underline;
    }
    ha-md-list-item img[slot="start"] {
      width: 40px;
      height: 40px;
    }
    ha-md-list-item span[slot="supporting-text"] {
      white-space: nowrap;
    }
    .error {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-repairs": HaConfigRepairs;
  }
}
