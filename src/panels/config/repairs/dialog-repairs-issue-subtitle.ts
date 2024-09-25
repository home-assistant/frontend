import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import { domainToName } from "../../../data/integration";
import type { RepairsIssue } from "../../../data/repairs";

@customElement("dialog-repairs-issue-subtitle")
class DialogRepairsIssueSubtitle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public issue!: RepairsIssue;

  protected firstUpdated() {
    if (this.scrollWidth > this.offsetWidth) {
      this.title = `${this._getSeverityText()}${this._getReportedByText()}`;
    }
  }

  protected render() {
    const reportedBy = this._getReportedByText();
    const severity = this._getSeverityText();

    return html`
      <span class=${this.issue.severity}> ${severity} </span>
      ${reportedBy}
    `;
  }

  private _getSeverityText() {
    return this.hass.localize(`ui.panel.config.repairs.${this.issue.severity}`);
  }

  private _getReportedByText() {
    const domainName = domainToName(this.hass.localize, this.issue.domain);
    return domainName
      ? this.hass.localize("ui.panel.config.repairs.reported_by", {
          integration: domainName,
        })
      : "";
  }

  static styles = css`
    :host {
      display: block;
      font-size: 14px;
      margin-bottom: 8px;
      color: var(--secondary-text-color);
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .error,
    .critical {
      color: var(--error-color);
    }
    .warning {
      color: var(--warning-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-repairs-issue-subtitle": DialogRepairsIssueSubtitle;
  }
}
