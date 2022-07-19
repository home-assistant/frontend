import "@material/mwc-list/mwc-list";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { relativeTime } from "../../../common/datetime/relative_time";
import { fireEvent } from "../../../common/dom/fire_event";
import { domainIcon } from "../../../common/entity/domain_icon";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import type { RepairsIssue } from "../../../data/repairs";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { showRepairsFlowDialog } from "./show-dialog-repair-flow";
import { showRepairsIssueDialog } from "./show-repair-issue-dialog";

@customElement("ha-config-repairs")
class HaConfigRepairs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false })
  public repairsIssues?: RepairsIssue[];

  protected render(): TemplateResult {
    if (!this.repairsIssues?.length) {
      return html``;
    }

    const issues = this.repairsIssues;

    return html`
      <div class="title">
        ${this.hass.localize("ui.panel.config.repairs.title", {
          count: this.repairsIssues.length,
        })}
      </div>
      <mwc-list>
        ${issues.map((issue) =>
          issue.ignored
            ? ""
            : html`
                <ha-list-item
                  twoline
                  graphic="avatar"
                  .hasMeta=${!this.narrow}
                  .issue=${issue}
                  @click=${this._openShowMoreDialog}
                >
                  <ha-svg-icon
                    slot="graphic"
                    .title=${issue.domain}
                    .path=${domainIcon(issue.domain)}
                    class=${ifDefined(issue.severity)}
                  ></ha-svg-icon>
                  <span
                    >${this.hass.localize(
                      `component.${issue.domain}.issues.${issue.issue_id}.title`
                    )}</span
                  >
                  <span slot="secondary" class="secondary">
                    ${issue.created
                      ? relativeTime(new Date(issue.created), this.hass.locale)
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
      showRepairsIssueDialog(this, { issue: (ev.currentTarget as any).issue });
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
    .secondary {
      text-transform: capitalize;
    }
    .error {
      color: var(--warning-color);
    }
    .critical {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-repairs": HaConfigRepairs;
  }
}
