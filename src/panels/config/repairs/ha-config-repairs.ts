import "@material/mwc-list/mwc-list";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { relativeTime } from "../../../common/datetime/relative_time";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import { domainToName } from "../../../data/integration";
import type { RepairsIssue } from "../../../data/repairs";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { showRepairsFlowDialog } from "./show-dialog-repair-flow";
import { showRepairsIssueDialog } from "./show-repair-issue-dialog";

@customElement("ha-config-repairs")
class HaConfigRepairs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false })
  public repairsIssues?: RepairsIssue[];

  @property({ type: Number })
  public total?: number;

  protected render(): TemplateResult {
    if (!this.repairsIssues?.length) {
      return html``;
    }

    const issues = this.repairsIssues;

    return html`
      <div class="title">
        ${this.hass.localize("ui.panel.config.repairs.title", {
          count: this.total || this.repairsIssues.length,
        })}
      </div>
      <mwc-list>
        ${issues.map(
          (issue) => html`
            <ha-list-item
              twoline
              graphic="avatar"
              .hasMeta=${!this.narrow}
              .issue=${issue}
              class=${issue.ignored ? "ignored" : ""}
              @click=${this._openShowMoreDialog}
            >
              <img
                loading="lazy"
                src=${brandsUrl({
                  domain: issue.domain,
                  type: "icon",
                  useFallback: true,
                  darkOptimized: this.hass.themes?.darkMode,
                })}
                .title=${domainToName(this.hass.localize, issue.domain)}
                referrerpolicy="no-referrer"
                slot="graphic"
              />
              <span
                >${this.hass.localize(
                  `component.${issue.domain}.issues.${
                    issue.translation_key || issue.issue_id
                  }.title`
                )}</span
              >
              <span slot="secondary" class="secondary">
                ${issue.created
                  ? relativeTime(new Date(issue.created), this.hass.locale)
                  : ""}
                ${issue.ignored
                  ? ` - ${this.hass.localize(
                      "ui.panel.config.repairs.dialog.ignored_in_version_short",
                      { version: issue.dismissed_version }
                    )}`
                  : ""}
              </span>
            </ha-list-item>
          `
        )}
      </mwc-list>
    `;
  }

  private _openShowMoreDialog(ev): void {
    const issue = ev.currentTarget.issue as RepairsIssue;
    if (issue.is_fixable) {
      showRepairsFlowDialog(this, issue, () => {
        // @ts-ignore
        fireEvent(this, "update-issues");
      });
    } else {
      showRepairsIssueDialog(this, {
        issue,
        dialogClosedCallback: () => {
          // @ts-ignore
          fireEvent(this, "update-issues");
        },
      });
    }
  }

  static styles = css`
    :host {
      --mdc-list-vertical-padding: 0;
    }
    .title {
      font-size: 16px;
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
    ha-list-item {
      cursor: pointer;
      font-size: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-repairs": HaConfigRepairs;
  }
}
