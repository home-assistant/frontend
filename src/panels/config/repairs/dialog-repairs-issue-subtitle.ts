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
      this.title =
        (this.shadowRoot?.firstElementChild as HTMLElement)?.innerText || "";
    }
  }

  protected render() {
    const domainName = domainToName(this.hass.localize, this.issue.domain);
    const reportedBy = domainName
      ? ` · ${this.hass.localize("ui.panel.config.repairs.reported_by", {
          integration: domainName,
        })}`
      : "";

    const severity = this.hass.localize(
      `ui.panel.config.repairs.${this.issue.severity}`
    );

    return html`
      <span>
        <span class=${this.issue.severity}> ${severity} </span>
        ${reportedBy}
      </span>
    `;
  }

  static styles = css`
    :host {
      display: block;
      font-size: var(--ha-font-size-m);
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
